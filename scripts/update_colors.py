import sys
import os
import json
from PIL import Image

def get_dominant_rgb(image_path):
    try:
        # Open image and resize to 64x64, just like the JS canvas
        with Image.open(image_path) as img:
            # Convert to RGB to ignore alpha channel if present
            img = img.convert("RGBA").convert("RGB")
            # Using nearest neighbor or default filter for resize isn't strictly important,
            # but JS drawImage typically uses bilinear. We can use default.
            img = img.resize((64, 64))
            pixels = img.getdata()
            
            r_sum = 0
            g_sum = 0
            b_sum = 0
            weight_sum = 0
            
            # The JS code iterated over the 1D ImageData array by i += 16
            # Since ImageData is 4 elements per pixel (RGBA), skipping 16 elements
            # translates to skipping 4 pixels. We process pixel 0, 4, 8...
            for index in range(0, 64 * 64, 4):
                r, g, b = pixels[index]
                
                max_val = max(r, g, b)
                min_val = min(r, g, b)
                
                # Weight more saturated and brighter pixels higher
                weight = (max_val - min_val) + (max_val * 0.5)
                # Add a base weight so even dark images get an average
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
        pass
        
    return '77, 181, 255' # Fallback to accent

def main():
    # Base directory is one level above the scripts directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(base_dir, 'data.json')
    colors_path = os.path.join(base_dir, 'colors.json')
    
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    image_paths = set()
    
    def extract_paths(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k == 'path' and isinstance(v, str):
                    image_paths.add(v)
                else:
                    extract_paths(v)
        elif isinstance(obj, list):
            for item in obj:
                extract_paths(item)
                
    extract_paths(data)
    
    colors_data = {}
    if os.path.exists(colors_path):
        with open(colors_path, 'r', encoding='utf-8') as f:
            try:
                colors_data = json.load(f)
            except json.JSONDecodeError:
                pass
                
    updated = False
    for path in sorted(image_paths):
        if path.startswith('data:'):
            continue
            
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
