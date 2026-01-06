
import sys

def check_braces(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()

    level = 0
    class_open_line = -1
    class_close_line = -1
    
    for i, line in enumerate(lines):
        # Very basic comment stripping
        code = line.split('//')[0]
        
        for char in code:
            if char == '{':
                if level == 0 and 'class CastManager' in line:
                    class_open_line = i + 1
                level += 1
            elif char == '}':
                level -= 1
                if level == 0 and class_open_line != -1 and class_close_line == -1:
                    class_close_line = i + 1
                    print(f"Brace Analysis: Class 'CastManager' starts at {class_open_line} and closes at {class_close_line}")
                
                if level < 0:
                    print(f"Brace Analysis: EXTRANEOUS '}}' detected at line {i + 1}")
                    return

    if level > 0:
        print(f"Brace Analysis: File ends with level {level} (Missing closing braces)")

check_braces('/Users/aniskedidi/Documents/perso/AnisFlix/ios-natve/anisflix/anisflix/Services/CastManager.swift')
