import json
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from content_paths import image_paths_from_content

def get_dominant_rgb(image_path):
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGBA").convert("RGB")
            img = img.resize((64, 64))
            pixels = img.getdata()

            r_sum = 0
            g_sum = 0
            b_sum = 0
            weight_sum = 0

            for index in range(0, 64 * 64, 4):
                r, g, b = pixels[index]

                max_val = max(r, g, b)
                min_val = min(r, g, b)

                weight = (max_val - min_val) + (max_val * 0.5)
                weight = (weight * weight) + 10

                r_sum += r * weight
                g_sum += g * weight
                b_sum += b * weight
                weight_sum += weight

            if weight_sum > 0:
                final_r = int(r_sum / weight_sum)
                final_g = int(g_sum / weight_sum)
                final_b = int(b_sum / weight_sum)
                return f"{final_r}, {final_g}, {final_b}"
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

    return '77, 181, 255'


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    colors_path = os.path.join(base_dir, 'colors.json')

    image_paths = image_paths_from_content()

    colors_data = {}
    if os.path.exists(colors_path):
        with open(colors_path, 'r', encoding='utf-8') as f:
            try:
                colors_data = json.load(f)
            except json.JSONDecodeError:
                pass

    updated = False
    for path in sorted(image_paths):
        if path not in colors_data:
            full_path = os.path.join(base_dir, path)
            if os.path.exists(full_path):
                print(f"Calculating color for {path}...")
                rgb = get_dominant_rgb(full_path)
                colors_data[path] = rgb
                updated = True
            else:
                print(f"Image not found: {full_path}")

    if updated or not os.path.exists(colors_path):
        with open(colors_path, 'w', encoding='utf-8') as f:
            json.dump(colors_data, f, indent=2)
        print("Updated colors.json")
    else:
        print("Everything is up to date. No new images to process.")


if __name__ == "__main__":
    main()
