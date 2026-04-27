import sys

def trace_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    depth = 0
    for i, line in enumerate(lines):
        prev_depth = depth
        depth += line.count('{') - line.count('}')
        if depth != prev_depth:
            safe_line = "".join(c if ord(c) < 128 else '?' for c in line.strip()[:60])
            print(f"{i+1:4} | {depth:2} | {safe_line}")

if __name__ == "__main__":
    trace_braces(sys.argv[1])
