import os
import pandas as pd
from PIL import Image
from torch.utils.data import Dataset

class SkinBurnDataset(Dataset):
    def __init__(self, data_list, transform=None):
        self.data = data_list
        self.transform = transform

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        img_path, label = self.data[idx]
        image = Image.open(img_path).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, label

def load_image_label_list(data_dir, rf_base_dir=None):
    image_label_list = []
    valid_exts = ['.png', '.jpg', '.jpeg']

    # 캐글 데이터셋
    for fname in os.listdir(data_dir):
        if fname.endswith('.txt'):
            base_name = fname.replace('.txt', '')
            matched_img = None
            for ext in valid_exts:
                candidate = os.path.join(data_dir, base_name + ext)
                if os.path.exists(candidate):
                    matched_img = candidate
                    break
            if matched_img is None:
                continue

            txt_path = os.path.join(data_dir, fname)
            with open(txt_path, 'r') as f:
                class_ids = [int(line.split()[0]) for line in f.readlines()]
            if class_ids:
                max_class = max(class_ids)
                image_label_list.append((matched_img, max_class))

    # roboflow 데이터셋
    if rf_base_dir:
        splits = ["train", "valid", "test"]
        for split in splits:
            split_dir = os.path.join(rf_base_dir, split)
            csv_path = os.path.join(split_dir, "_classes.csv")
            if not os.path.exists(csv_path):
                continue

            df = pd.read_csv(csv_path)
            df.columns = df.columns.str.strip()

            for _, row in df.iterrows():
                fname = row['filename'].strip()
                img_path = os.path.join(split_dir, fname)
                if not fname.lower().endswith('.jpg'):
                    continue
                if not os.path.exists(img_path):
                    continue
                label = int(row[['0', '1', '2']].astype(int).idxmax())
                image_label_list.append((img_path, label))

    return image_label_list
