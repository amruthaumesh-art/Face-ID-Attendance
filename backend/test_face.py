
import cv2
from pathlib import Path
from face_enrollment import get_face_model

image_path = Path(r"C:\Users\Dell\Downloads\ananya.png")
print("Image exists:", image_path.exists())

image = cv2.imread(str(image_path))

if image is None:
    print("ERROR: Could not read image")
else:
    print("Image dimensions:", image.shape)

    model = get_face_model()
    faces = model.get(image)

    print("Faces detected:", len(faces))

    for face in faces:
        print("Bounding box:", face.bbox)
        print("Embedding dimensions:", len(face.normed_embedding))

        x1, y1, x2, y2 = face.bbox.astype(int)

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        region = gray[max(0,y1):min(gray.shape[0],y2),
                      max(0,x1):min(gray.shape[1],x2)]

        print("Blur score:", cv2.Laplacian(
            region, cv2.CV_64F
        ).var())
