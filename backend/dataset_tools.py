"""
Tools to test the Face ID backend with the FEI face dataset
(200 people x 14 photos: images 1-10 = head turning left->right,
 11 = neutral front, 12 = smiling front, 13-14 = front, dimmer light).

Run from your backend folder (where main.py is):

  1) Measure accuracy + best threshold (does NOT touch students.db):
       python dataset_tools.py eval  path\\to\\archive_folder

  2) Build a fake "class photo" + row-wise photos for 20 people:
       python dataset_tools.py collage  path\\to\\archive_folder

  3) Register 20 test students + enroll them in the running server
     (class name FEI-TEST, server must be running on port 8000):
       python dataset_tools.py enroll  path\\to\\archive_folder

Then upload out_test/class_photo.jpg (or the 4 row_*.jpg files together)
in the /app page for class FEI-TEST.
"""
import json
import random
import sys
import uuid
import urllib.request
from pathlib import Path

import cv2
import numpy as np

N_PEOPLE = 20
SEED = 7
ENROLL_IMAGES = [4, 5, 6, 7, 11, 13]          # used to enroll
TEST_IMAGES = {                                # held out for testing
    "smiling (12)": 12,
    "dim light (14)": 14,
    "turned left (3)": 3,
    "turned right (9)": 9,
}
CLASS_NAME = "FEI-TEST"
API = "http://127.0.0.1:8000"


def find_image(root: Path, person: int, num: int) -> Path:
    name = f"{person}-{num:02d}.jpg"   # ids are not zero-padded in this dataset
    for p in root.rglob(name):
        return p
    raise FileNotFoundError(name)


def pick_people(root: Path):
    ids = sorted({int(p.name.split("-")[0]) for p in root.rglob("*-01.jpg")})
    rng = random.Random(SEED)
    rng.shuffle(ids)
    return ids[:N_PEOPLE], ids[N_PEOPLE:N_PEOPLE * 2]   # enrolled, strangers


def load_model():
    from insightface.app import FaceAnalysis
    model = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    model.prepare(ctx_id=-1, det_size=(640, 640))
    return model


def biggest_face_embedding(model, img):
    faces = model.get(img)
    if not faces:
        return None
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    return np.asarray(face.normed_embedding, dtype=np.float32)


# ------------------------------------------------------------------ eval
def cmd_eval(root: Path):
    model = load_model()
    enrolled, strangers = pick_people(root)

    gallery = {}
    for pid in enrolled:
        embs = []
        for n in ENROLL_IMAGES:
            e = biggest_face_embedding(model, cv2.imread(str(find_image(root, pid, n))))
            if e is not None:
                embs.append(e)
        gallery[pid] = embs
    print(f"Enrolled {len(gallery)} people, "
          f"{sum(len(v) for v in gallery.values())} embeddings")

    def best_match(e):
        best_pid, best = None, -1.0
        for pid, embs in gallery.items():
            s = max(float(np.dot(e, g)) for g in embs)
            if s > best:
                best_pid, best = pid, s
        return best_pid, best

    known = []          # (category, true_id, matched_id, score)
    no_face = 0
    for pid in enrolled:
        for label, n in TEST_IMAGES.items():
            e = biggest_face_embedding(model, cv2.imread(str(find_image(root, pid, n))))
            if e is None:
                no_face += 1
                known.append((label, pid, None, 0.0))
                continue
            m, s = best_match(e)
            known.append((label, pid, m, s))

    unknown_scores = []
    for pid in strangers:
        for n in (11, 12):
            e = biggest_face_embedding(model, cv2.imread(str(find_image(root, pid, n))))
            if e is not None:
                unknown_scores.append(best_match(e)[1])

    print(f"Faces not detected in held-out photos: {no_face} of {len(known)}\n")
    print("threshold | correct | wrong person | missed | strangers accepted")
    best_t, best_score = None, -1
    for t in np.arange(0.20, 0.71, 0.05):
        correct = sum(1 for _, pid, m, s in known if m == pid and s >= t)
        wrong = sum(1 for _, pid, m, s in known if m is not None and m != pid and s >= t)
        missed = len(known) - correct - wrong
        fa = sum(1 for s in unknown_scores if s >= t)
        pc = 100 * correct / len(known)
        fa_pct = 100 * fa / max(1, len(unknown_scores))
        print(f"  {t:.2f}    | {pc:5.1f}%  | {wrong:3d}          | {missed:3d}    | {fa}/{len(unknown_scores)} ({fa_pct:.1f}%)")
        if fa_pct <= 1.0 and wrong == 0 and pc > best_score:
            best_t, best_score = t, pc
    print()
    if best_t is not None:
        print(f"Suggested SIMILARITY_THRESHOLD = {best_t:.2f} "
              f"({best_score:.1f}% correct, no wrong matches, <=1% strangers accepted)")
    else:
        print("No threshold met the safety target; look at the table above.")

    print("\nBy condition (at suggested/0.45 threshold):")
    t = best_t if best_t is not None else 0.45
    for label in TEST_IMAGES:
        rows = [r for r in known if r[0] == label]
        ok = sum(1 for _, pid, m, s in rows if m == pid and s >= t)
        print(f"  {label:18s} {ok}/{len(rows)} correct")


# --------------------------------------------------------------- collage
def cmd_collage(root: Path):
    enrolled, _ = pick_people(root)
    out = Path("out_test")
    out.mkdir(exist_ok=True)
    # held-out photo (NOT used for enrollment): the smiling front photo.
    # (The dim-light photos are tested in "eval"; some are almost black.)
    use = [12, 12, 12, 12]
    rows = []
    scales = [1.0, 0.8, 0.65, 0.5]       # farther rows -> smaller faces
    idx = 0
    for r in range(4):
        row_imgs = []
        for c in range(5):
            pid = enrolled[idx]
            img = cv2.imread(str(find_image(root, pid, use[r])))
            s = scales[r]
            img = cv2.resize(img, (int(640 * s), int(480 * s)))
            canvas = np.full((480, 640, 3), 200, np.uint8)
            y = 480 - img.shape[0]
            x = (640 - img.shape[1]) // 2
            canvas[y:y + img.shape[0], x:x + img.shape[1]] = img
            row_imgs.append(canvas)
            idx += 1
        row = np.hstack(row_imgs)
        cv2.imwrite(str(out / f"row_{r + 1}.jpg"), row, [cv2.IMWRITE_JPEG_QUALITY, 92])
        rows.append(row)
    cv2.imwrite(str(out / "class_photo.jpg"), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 90])
    (out / "who_is_in_photo.txt").write_text(
        "\n".join(f"FEI{p:03d}" for p in enrolled), encoding="utf-8")
    print("Created out_test/class_photo.jpg (all 20), row_1..row_4.jpg and the answer list.")
    print("Note: class_photo.jpg is large; the server limit is 10 MB per image.")


# ---------------------------------------------------------------- enroll
def post_json(path, data):
    req = urllib.request.Request(
        API + path, data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    try:
        urllib.request.urlopen(req).read()
    except urllib.error.HTTPError as e:
        if e.code != 409:   # 409 = already registered, fine
            raise


def post_file(path, filepath: Path):
    boundary = uuid.uuid4().hex
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; "
        f"filename=\"{filepath.name}\"\r\nContent-Type: image/jpeg\r\n\r\n"
    ).encode() + filepath.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        API + path, data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST")
    try:
        urllib.request.urlopen(req).read()
        return True
    except urllib.error.HTTPError as e:
        return False     # e.g. blur/face-size check rejected the photo


def cmd_enroll(root: Path):
    enrolled, _ = pick_people(root)
    for pid in enrolled:
        sid = f"FEI{pid:03d}"
        post_json("/students", {"student_id": sid, "name": f"FEI Subject {pid:03d}",
                                "class_name": CLASS_NAME})
        ok = sum(post_file(f"/students/{sid}/faces", find_image(root, pid, n))
                 for n in ENROLL_IMAGES)
        print(f"{sid}: {ok}/{len(ENROLL_IMAGES)} photos enrolled")
    print(f"Done. Class name: {CLASS_NAME}")


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in ("eval", "collage", "enroll"):
        print(__doc__)
        sys.exit(1)
    folder = Path(sys.argv[2])
    {"eval": cmd_eval, "collage": cmd_collage, "enroll": cmd_enroll}[sys.argv[1]](folder)
