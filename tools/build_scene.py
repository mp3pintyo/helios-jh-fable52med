"""Generates scene/vault.glb - the 3D "evidence vault" rendered by Helios behind the page.

Run:  python tools/build_scene.py
Only boxes and cylinders; every object is a node referencing a shared mesh per (shape, material).
The node positions of the story "stations" are mirrored in index.html (STATIONS).
"""
import json, math, struct, os

OUT = os.path.join(os.path.dirname(__file__), "..", "scene", "vault.glb")

# ---------------------------------------------------------------- geometry
def box():
    P, N, UV, I = [], [], [], []
    faces = [((1, 0, 0), (0, 1, 0), (0, 0, 1)), ((-1, 0, 0), (0, 1, 0), (0, 0, -1)),
             ((0, 1, 0), (0, 0, 1), (1, 0, 0)), ((0, -1, 0), (0, 0, -1), (1, 0, 0)),
             ((0, 0, 1), (1, 0, 0), (0, 1, 0)), ((0, 0, -1), (-1, 0, 0), (0, 1, 0))]
    for n, u, v in faces:
        b = len(P)
        for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            P.append(tuple(0.5 * (n[i] + su * u[i] + sv * v[i]) for i in range(3)))
            N.append(n)
            UV.append(((su + 1) / 2, (sv + 1) / 2))
        # winding so that cross(u, v) == n  -> counter-clockwise from outside
        cx = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
        if sum(cx[i] * n[i] for i in range(3)) > 0:
            I += [b, b + 1, b + 2, b, b + 2, b + 3]
        else:
            I += [b, b + 2, b + 1, b, b + 3, b + 2]
    return P, N, UV, I


def cylinder(seg=40):
    P, N, UV, I = [], [], [], []
    for i in range(seg + 1):
        a = 2 * math.pi * i / seg
        c, s = math.cos(a), math.sin(a)
        for y in (-0.5, 0.5):
            P.append((0.5 * c, y, 0.5 * s)); N.append((c, 0, s)); UV.append((i / seg, y + 0.5))
    for i in range(seg):
        a, b, c, d = 2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 3
        I += [a, b, c, c, b, d]
    for y, ny in ((0.5, 1), (-0.5, -1)):
        ctr = len(P)
        P.append((0, y, 0)); N.append((0, ny, 0)); UV.append((0.5, 0.5))
        for i in range(seg + 1):
            a = 2 * math.pi * i / seg
            P.append((0.5 * math.cos(a), y, 0.5 * math.sin(a))); N.append((0, ny, 0))
            UV.append((0.5 + 0.5 * math.cos(a), 0.5 + 0.5 * math.sin(a)))
        for i in range(seg):
            if ny > 0:
                I += [ctr, ctr + 2 + i, ctr + 1 + i]
            else:
                I += [ctr, ctr + 1 + i, ctr + 2 + i]
    return P, N, UV, I

# ---------------------------------------------------------------- materials
def mat(name, color, rough, metal, emissive=None, strength=1.0):
    m = {"name": name, "pbrMetallicRoughness": {"baseColorFactor": [*color, 1.0],
                                                "roughnessFactor": rough, "metallicFactor": metal}}
    if emissive:
        m["emissiveFactor"] = list(emissive)
        m["extensions"] = {"KHR_materials_emissive_strength": {"emissiveStrength": strength}}
    return m

G = (0.463, 0.725, 0.0)  # NVIDIA green #76B900
MATERIALS = [
    mat("floor", (0.012, 0.014, 0.012), 0.22, 0.0),
    mat("body", (0.03, 0.032, 0.03), 0.38, 0.85),
    mat("rack", (0.012, 0.012, 0.012), 0.6, 0.3),
    mat("stone", (0.42, 0.42, 0.40), 0.75, 0.0),
    mat("crate", (0.42, 0.31, 0.19), 0.9, 0.0),
    mat("green", G, 0.4, 0.0, G, 9.0),
    mat("greendim", G, 0.4, 0.0, G, 2.2),
    mat("white", (0.9, 0.92, 0.88), 0.4, 0.0, (0.9, 0.95, 0.85), 5.0),
    mat("whitedim", (0.9, 0.92, 0.88), 0.4, 0.0, (0.9, 0.95, 0.85), 1.4),
]
MI = {m["name"]: i for i, m in enumerate(MATERIALS)}

# ---------------------------------------------------------------- scene assembly
nodes = []  # (shape, material, t, r, s)
QI = (0, 0, 0, 1)
QX90 = (math.sin(math.pi / 4), 0, 0, math.cos(math.pi / 4))  # cylinder axis Y -> Z

def B(m, c, s, r=QI): nodes.append(("box", m, c, r, s))
def C(m, c, s, r=QI): nodes.append(("cyl", m, c, r, s))

def floor_line(m, a, b, width=0.09, dash=None, y=0.05):
    """Glowing string on the floor from a to b (x,z pairs). dash=(on, off) for alleged links."""
    dx, dz = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dz)
    ang = math.atan2(-dz, dx)  # rotation about Y that maps +X onto the segment
    q = (0, math.sin(ang / 2), 0, math.cos(ang / 2))
    segs = [(0, L)] if not dash else []
    if dash:
        t = 0
        while t < L:
            segs.append((t, min(L, t + dash[0]))); t += dash[0] + dash[1]
    for t0, t1 in segs:
        mid = (t0 + t1) / 2 / L
        B(m, (a[0] + dx * mid, y, a[1] + dz * mid), (t1 - t0, 0.035, width), q)

def pylon(x, z, h, cap="white", w=0.5):
    B("body", (x, h / 2, z), (w, h, w))
    B(cap, (x, h + 0.05, z), (w + 0.04, 0.1, w + 0.04))
    B(cap + "dim" if cap in ("green", "white") else cap, (x, h * 0.5, z + w / 2 + 0.01), (0.05, h * 0.86, 0.02))

def gpu_card(cx, cy, cz, L, H, T, fans=3):
    """A graphics card standing on its long edge, fans facing +Z."""
    B("body", (cx, cy, cz), (L, H, T))
    B("green", (cx, cy + H / 2 + 0.03 * H / 3, cz + T * 0.3), (L * 0.94, 0.02 * H, 0.2 * T))
    r = H * 0.38
    for i in range(fans):
        fx = cx + (i - (fans - 1) / 2) * (L / fans)
        C("green", (fx, cy, cz + T / 2 + 0.01), (2 * r * 1.06, 0.02, 2 * r * 1.06), QX90)
        C("rack", (fx, cy, cz + T / 2 + 0.03), (2 * r, 0.05, 2 * r), QX90)
        C("green", (fx, cy, cz + T / 2 + 0.06), (r * 0.5, 0.05, r * 0.5), QX90)
    B("stone", (cx - L / 2 - 0.02 * L, cy, cz), (0.02 * L, H * 1.1, T * 1.1))  # bracket

# floor (the engine adds its own ground plane at y=0; ours sits just above it)
B("floor", (0, -0.04, 0), (120, 0.12, 120))

# --- station: NVIDIA / Jensen Huang - the monolith card at the centre
B("body", (0, 0.2, 0), (8.2, 0.4, 1.8))
B("green", (0, 0.41, 0.86), (8.0, 0.03, 0.05))
B("green", (0, 0.41, -0.86), (8.0, 0.03, 0.05))
gpu_card(0, 2.1, 0, 7.2, 3.2, 0.7)

# --- station: Alice Huang - a single slim pylon, close to the card
pylon(-6.5, 6.0, 4.6, "white", 0.42)

# --- station: Megaspeed - server racks and a pile of unopened crates
for row, z in enumerate((-5.4, -2.6)):
    for i in range(6):
        x = -17.5 + i * 1.0
        B("rack", (x, 1.1, z), (0.84, 2.2, 1.1))
        face = z + (0.56 if row == 0 else -0.56)
        for k, yy in enumerate((0.5, 0.95, 1.4, 1.85)):
            if (i + k + row) % 3 != 0:
                B("greendim", (x, yy, face), (0.55, 0.035, 0.02))
crates = [(-11.2, 0, -1.6), (-10.2, 0, -1.7), (-9.25, 0, -1.5), (-11.0, 0, -0.6), (-10.0, 0, -0.65),
          (-10.7, 1, -1.6), (-9.7, 1, -1.55), (-10.5, 1, -0.7), (-10.2, 2, -1.5), (-8.3, 0, -0.9),
          (-11.9, 0, -2.7), (-10.9, 0, -2.75), (-11.4, 1, -2.7)]
for x, lvl, z in crates:
    B("crate", (x, 0.45 + lvl * 0.9, z), (0.88, 0.88, 0.88))
    B("rack", (x, 0.45 + lvl * 0.9, z), (0.9, 0.06, 0.9))  # tape band

# --- station: Beijing / MSS - three tall pylons
pylon(-20.0, 12.0, 7.0, "white", 0.7)
pylon(-21.6, 13.2, 5.0, "white", 0.55)
pylon(-18.6, 13.4, 4.0, "white", 0.55)

# --- station: Washington - a colonnade
B("stone", (14, 0.1, 8), (6.6, 0.2, 1.4))
for i in range(6):
    C("stone", (11.5 + i, 2.0, 8), (0.46, 3.6, 0.46))
B("stone", (14, 4.0, 8), (6.4, 0.4, 1.1))
B("white", (14, 3.76, 8.5), (5.8, 0.05, 0.05))

# --- station: Wall Street - a bar chart that climbs, then breaks
heights = [1.6, 2.0, 2.5, 3.1, 3.8, 4.6, 5.2, 4.3, 3.3, 2.4]
for i, h in enumerate(heights):
    up = i <= 6
    B("greendim" if up else "whitedim", (10.2 + i * 0.7, h / 2, -9), (0.46, h, 0.46))
B("body", (13.35, 0.06, -9), (7.6, 0.12, 1.2))

# --- station: gamers - small cards on plinths
for i in range(5):
    x = -4 + i * 2.0
    B("body", (x, 0.5, -15), (0.9, 1.0, 0.9))
    gpu_card(x, 1.45, -15, 1.3, 0.62, 0.14, fans=2)

# --- strings on the floor: solid = documented link, dashed = alleged link
HUB = (0, 1.3)
floor_line("green", HUB, (-6.5, 5.6))                              # Jensen - Alice: affair (admitted)
floor_line("green", (-4.3, -0.6), (-11.6, -3.6))                   # Nvidia - Megaspeed: $4.8bn of hardware
floor_line("white", (-6.9, 6.2), (-19.4, 11.8), dash=(0.7, 0.5))   # Alice - Beijing: alleged
floor_line("white", (-14.5, -1.8), (-20.0, 11.2), dash=(0.7, 0.5)) # Megaspeed - China: alleged diversion
floor_line("white", (-6.1, 6.1), (11.2, 8.0), dash=(0.7, 0.5))     # Washington - Alice: surveillance
floor_line("green", (4.3, 0.9), (11.0, 7.4))                       # Nvidia - Washington: lobbying
floor_line("green", (4.3, -0.9), (10.0, -8.4))                     # Nvidia - Wall Street
floor_line("green", (0, -1.3), (0, -14.2))                         # Nvidia - gamers

# ---------------------------------------------------------------- GLB writer
def pad4(b, fill=b"\x00"):
    return b + fill * ((4 - len(b) % 4) % 4)

buf = b""
views, accessors, shapes = [], [], {}
for name, (P, N, UV, I) in (("box", box()), ("cyl", cylinder())):
    ids = []
    for data, fmt, typ, tgt in ((P, "3f", "VEC3", 34962), (N, "3f", "VEC3", 34962), (UV, "2f", "VEC2", 34962)):
        raw = b"".join(struct.pack("<" + fmt, *v) for v in data)
        views.append({"buffer": 0, "byteOffset": len(buf), "byteLength": len(raw), "target": tgt})
        acc = {"bufferView": len(views) - 1, "componentType": 5126, "count": len(data), "type": typ}
        if data is P:
            acc["min"] = [min(v[i] for v in data) for i in range(3)]
            acc["max"] = [max(v[i] for v in data) for i in range(3)]
        accessors.append(acc); ids.append(len(accessors) - 1)
        buf = pad4(buf + raw)
    raw = struct.pack("<%dI" % len(I), *I)
    views.append({"buffer": 0, "byteOffset": len(buf), "byteLength": len(raw), "target": 34963})
    accessors.append({"bufferView": len(views) - 1, "componentType": 5125, "count": len(I), "type": "SCALAR"})
    ids.append(len(accessors) - 1)
    buf = pad4(buf + raw)
    shapes[name] = ids

meshes, mesh_ix, gl_nodes = [], {}, []
for shape, m, t, r, s in nodes:
    key = (shape, m)
    if key not in mesh_ix:
        p, n, uv, ix = shapes[shape]
        meshes.append({"name": f"{shape}_{m}", "primitives": [{
            "attributes": {"POSITION": p, "NORMAL": n, "TEXCOORD_0": uv}, "indices": ix, "material": MI[m]}]})
        mesh_ix[key] = len(meshes) - 1
    gl_nodes.append({"mesh": mesh_ix[key], "translation": list(t), "rotation": list(r), "scale": list(s)})

gltf = {"asset": {"version": "2.0", "generator": "jensen-case-file"},
        "extensionsUsed": ["KHR_materials_emissive_strength"],
        "scene": 0, "scenes": [{"nodes": list(range(len(gl_nodes)))}],
        "nodes": gl_nodes, "meshes": meshes, "materials": MATERIALS,
        "accessors": accessors, "bufferViews": views, "buffers": [{"byteLength": len(buf)}]}
js = pad4(json.dumps(gltf, separators=(",", ":")).encode(), b" ")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "wb") as f:
    f.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(buf)))
    f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack("<II", len(buf), 0x004E4942)); f.write(buf)
print(f"{OUT}: {len(gl_nodes)} nodes, {len(meshes)} meshes, {12 + 16 + len(js) + len(buf)} bytes")
