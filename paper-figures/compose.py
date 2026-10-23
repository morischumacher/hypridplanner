"""Compose the three Graph View panel crops into shell_graph_view_crop.png.

    python3 compose.py <dir>

Panels are placed side by side, top-aligned, on white, separated by a thin even
gap; the space the application leaves between them is dropped. The canvas
page background colour (#f9fafb) is mapped to white in all crops.
"""
import sys
from pathlib import Path

from PIL import Image

GAP = 36  # device px (12 CSS px at scale 3)


def whiten(im: Image.Image) -> Image.Image:
    im = im.convert("RGB")
    bg = (249, 250, 251)  # the application's page background
    if bg == (255, 255, 255):
        return im
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y] == bg:
                px[x, y] = (255, 255, 255)
    return im


def main(out: Path) -> None:
    panels = [Image.open(out / n).convert("RGB") for n in ("panel_filters.png", "panel_graph.png", "panel_dashboard.png")]
    # The page background (graph canvas, rounded panel corners, crop margins) becomes white.
    names = ("panel_filters.png", "panel_graph.png", "panel_dashboard.png")
    panels = [whiten(p) for p in panels]
    for p, n in zip(panels, names):
        p.save(out / n, optimize=True)
    whiten(Image.open(out / "table_view.png")).save(out / "table_view.png", optimize=True)
    width = sum(p.width for p in panels) + GAP * (len(panels) - 1)
    height = max(p.height for p in panels)
    canvas = Image.new("RGB", (width, height), (255, 255, 255))
    x = 0
    for p in panels:
        canvas.paste(p, (x, 0))
        x += p.width + GAP
    canvas.save(out / "shell_graph_view_crop.png", optimize=True)
    print(f"shell_graph_view_crop.png: {width} x {height}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
