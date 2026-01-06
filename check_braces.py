
import sys

def check_braces(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()

    stack = []
    
    # Simple brace counter (ignoring strings/comments for speed, assuming code is mostly clean)
    # Ideally should parse properly, but this usually works for finding the "extra }"
    
    for i, line in enumerate(lines):
        # Strip comments roughly
        clean_line = line.split('//')[0]
        
        for char in clean_line:
            if char == '{':
                stack.append(i + 1)
            elif char == '}':
                if not stack:
                    print(f"Error: Extraneous '}}' at line {i + 1}")
                    return
                stack.pop()
                if not stack:
                    print(f"Info: Stack became empty (Struct closed?) at line {i + 1}")

    if stack:
        print(f"Error: Unclosed '{{' at line {stack[-1]}")

check_braces('/Users/aniskedidi/Documents/perso/AnisFlix/ios-natve/anisflix/anisflix/Views/HomeView.swift')
