import json, pathlib, struct
root = pathlib.Path(__file__).resolve().parent
rows = []
for name in ['before', 'after']:
    data = (root / name / 'case.stl').read_bytes()
    n = struct.unpack_from('<I', data, 80)[0]
    vertices = set()
    for i in range(n):
        record = struct.unpack_from('<12fH', data, 84 + i*50)
        for j in [3,6,9]:
            vertices.add(tuple(round(c, 6) for c in record[j:j+3]))
    bore = [v for v in vertices if (v[0]**2 + v[2]**2)**0.5 <= 4.85]
    row = {'version': name, 'facets': n, 'unique_vertices': len(vertices), 'bore_vertices': len(bore), 'bore_z_min_mm': min(v[2] for v in bore), 'bore_z_max_mm': max(v[2] for v in bore)}
    rows.append(row)
print(json.dumps(rows, indent=2))
assert abs(rows[0]['bore_z_min_mm'] + 4.8) < 0.001
assert abs(rows[0]['bore_z_max_mm'] - 3.0) < 0.001
assert abs(rows[1]['bore_z_min_mm'] + 3.0) < 0.001
assert abs(rows[1]['bore_z_max_mm'] - 4.8) < 0.001
(root / 'geometry-measurements.json').write_text(json.dumps(rows, indent=2))
print('Verified: PR #424 flips the bore apex from -4.8 mm to +4.8 mm.')
