"""
face_model.py - the ONE place the backend gets faces and embeddings from.

Recognizer : the team's trained model, models/casia_iresnet50.onnx
             (IResNet-50 + ArcFace, trained on CASIA-WebFace, 512-d embedding).
             If that file is missing, the pretrained InsightFace buffalo_l recognizer is used.
Detector   : InsightFace SCRFD (from buffalo_l, pretrained), run at 640 on the whole image,
             plus overlapping 1280-px tiles on large photos so small back-row faces are found.

Use from other files:
    from face_model import detect_faces, embed_face, THRESHOLD, confidence, MODEL_NAME
    faces = detect_faces(img_bgr)          # Face objects (bbox, kps, det_score), largest first
    emb   = embed_face(img_bgr, faces[0])  # np.float32 (512,), L2-normalised
    sim   = float(emb @ other_emb)         # cosine similarity
    match = sim >= THRESHOLD
    conf  = confidence(sim)                # 0..1, calibrated probability

Self-test:
    python face_model.py info
    python face_model.py photo   path\\to\\photo.jpg
    python face_model.py compare a.jpg b.jpg
"""
import json
import math
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ONNX_PATH = os.environ.get("FACE_MODEL_PATH", os.path.join(HERE, "models", "casia_iresnet50.onnx"))
DET_SIZE = 640     # detector input size (per image / per tile)
TILE = 1280        # tile size for large photos

USE_TRAINED = os.path.exists(ONNX_PATH)
MODEL_NAME = "casia_iresnet50" if USE_TRAINED else "buffalo_l"

_cfg = {}
if USE_TRAINED:
    _cfg_path = os.path.splitext(ONNX_PATH)[0] + ".json"
    if os.path.exists(_cfg_path):
        with open(_cfg_path) as fh:
            _cfg = json.load(fh)
    THRESHOLD = float(os.environ.get("FACE_THRESHOLD", _cfg.get("threshold", 0.261)))
else:
    THRESHOLD = float(os.environ.get("FACE_THRESHOLD", 0.45))
_PLATT = _cfg.get("platt")

_detector = None   # SCRFD
_rec = None        # buffalo_l recognizer (fallback only)
_sess = None       # onnxruntime session (trained model)
_inp = None


def _load():
    """Load models once, on first use."""
    global _detector, _rec, _sess, _inp
    if _detector is not None:
        return
    from insightface.app import FaceAnalysis
    modules = ["detection"] if USE_TRAINED else ["detection", "recognition"]
    app = FaceAnalysis(name="buffalo_l", allowed_modules=modules, providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(DET_SIZE, DET_SIZE))
    _detector = app.det_model
    if USE_TRAINED:
        import onnxruntime as ort
        _sess = ort.InferenceSession(ONNX_PATH, providers=["CPUExecutionProvider"])
        _inp = _sess.get_inputs()[0].name
    else:
        _rec = app.models["recognition"]
    print(f"[face_model] recognizer={MODEL_NAME} threshold={THRESHOLD:.3f}", flush=True)


# ---------------------------------------------------------------- detection
def _tiles(W, H):
    boxes = [(0, 0, W, H)]                       # whole image: catches large faces
    if max(W, H) > TILE * 1.25:                  # big photo: overlapping tiles for small faces
        step = int(TILE * 0.8)
        for y in range(0, max(H - TILE, 0) + step, step):
            for x in range(0, max(W - TILE, 0) + step, step):
                x0, y0 = min(x, max(W - TILE, 0)), min(y, max(H - TILE, 0))
                boxes.append((x0, y0, min(x0 + TILE, W), min(y0 + TILE, H)))
    return list(dict.fromkeys(boxes))


def _nms(b, scores):
    """Remove the same face found in two overlapping tiles."""
    order, keep = scores.argsort()[::-1], []
    area = (b[:, 2] - b[:, 0]) * (b[:, 3] - b[:, 1])
    while order.size:
        i, rest = order[0], order[1:]
        keep.append(i)
        iw = np.clip(np.minimum(b[i, 2], b[rest, 2]) - np.maximum(b[i, 0], b[rest, 0]), 0, None)
        ih = np.clip(np.minimum(b[i, 3], b[rest, 3]) - np.maximum(b[i, 1], b[rest, 1]), 0, None)
        inter = iw * ih
        iou = inter / (area[i] + area[rest] - inter + 1e-9)
        contain = inter / (np.minimum(area[i], area[rest]) + 1e-9)
        order = rest[(iou <= 0.4) & (contain <= 0.7)]
    return keep


def detect_faces(img_bgr):
    """Detect all faces. Returns InsightFace Face objects, largest first."""
    _load()
    if img_bgr is None:
        return []
    from insightface.app.common import Face
    H, W = img_bgr.shape[:2]
    B, K = [], []
    for x0, y0, x1, y1 in _tiles(W, H):
        b, k = _detector.detect(np.ascontiguousarray(img_bgr[y0:y1, x0:x1]),
                                input_size=(DET_SIZE, DET_SIZE))
        if b is None or len(b) == 0:
            continue
        b, k = b.copy(), k.copy()
        b[:, [0, 2]] += x0
        b[:, [1, 3]] += y0
        k[:, :, 0] += x0
        k[:, :, 1] += y0
        B.append(b)
        K.append(k)
    if not B:
        return []
    B, K = np.concatenate(B), np.concatenate(K)
    faces = [Face(bbox=B[i, :4], kps=K[i], det_score=float(B[i, 4])) for i in _nms(B[:, :4], B[:, 4])]
    faces.sort(key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]), reverse=True)
    return faces


# ---------------------------------------------------------------- embedding
def align_face(img_bgr, face):
    """112x112 aligned face crop (BGR), same alignment the model was trained with."""
    from insightface.utils import face_align
    return face_align.norm_crop(img_bgr, landmark=face.kps, image_size=112)


def embed_face(img_bgr, face):
    """512-d L2-normalised embedding for one detected face."""
    _load()
    if not USE_TRAINED:
        e = _rec.get(img_bgr, face)
        return (e / np.linalg.norm(e)).astype(np.float32)
    crop = align_face(img_bgr, face)
    # identical preprocessing to training: RGB, scaled to [-1, 1], plus a mirrored copy
    x = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB).astype(np.float32)
    x = ((x / 255.0 - 0.5) / 0.5).transpose(2, 0, 1)[None]
    x = np.concatenate([x, x[:, :, :, ::-1]]).copy()
    e = _sess.run(None, {_inp: x})[0].sum(axis=0)
    return (e / np.linalg.norm(e)).astype(np.float32)


def face_sharpness(img_bgr, face):
    """Blur score of the aligned face (higher = sharper)."""
    gray = cv2.cvtColor(align_face(img_bgr, face), cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def confidence(sim):
    """Probability (0..1) that a match at this similarity is correct (Platt-calibrated on LFW)."""
    z = _PLATT["a"] * sim + _PLATT["b"] if _PLATT else 20.0 * (sim - THRESHOLD)
    return 1.0 / (1.0 + math.exp(-max(min(z, 50.0), -50.0)))


# ---------------------------------------------------------------- self-test
def _main(argv):
    if not argv or argv[0] == "info":
        print(f"model file : {ONNX_PATH} ({'found' if USE_TRAINED else 'MISSING -> buffalo_l fallback'})")
        print(f"recognizer : {MODEL_NAME}")
        print(f"threshold  : {THRESHOLD:.3f}")
        print(f"calibrated : {bool(_PLATT)}")
        _load()
        print("models load OK")
        return
    if argv[0] == "photo" and len(argv) == 2:
        img = cv2.imread(argv[1])
        if img is None:
            sys.exit(f"cannot read {argv[1]}")
        faces = detect_faces(img)
        print(f"{argv[1]}: {img.shape[1]}x{img.shape[0]}, {len(faces)} face(s)")
        for i, f in enumerate(faces, 1):
            w = int(f.bbox[2] - f.bbox[0])
            e = embed_face(img, f)
            print(f"  face {i}: width={w}px det_score={f.det_score:.2f} "
                  f"sharpness={face_sharpness(img, f):.0f} norm={np.linalg.norm(e):.3f}")
        return
    if argv[0] == "compare" and len(argv) == 3:
        embs = []
        for p in argv[1:]:
            img = cv2.imread(p)
            faces = detect_faces(img) if img is not None else []
            if not faces:
                sys.exit(f"no face found in {p}")
            embs.append(embed_face(img, faces[0]))
        sim = float(embs[0] @ embs[1])
        print(f"similarity {sim:.3f} | threshold {THRESHOLD:.3f} | "
              f"{'SAME person' if sim >= THRESHOLD else 'DIFFERENT people'} | confidence {confidence(sim)*100:.1f}%")
        return
    print(__doc__)


if __name__ == "__main__":
    _main(sys.argv[1:])
