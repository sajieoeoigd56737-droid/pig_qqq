import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

HTML_PATH = Path(__file__).parent / "index.html"
OUT_DIR = Path(__file__).parent / "slide_pngs"
NUM_SLIDES = 10
WIDTH, HEIGHT = 1920, 1080

async def capture():
    OUT_DIR.mkdir(exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": WIDTH, "height": HEIGHT})
        await page.goto(f"file://{HTML_PATH.resolve()}")
        # wait for WebGL background and motion library
        await page.wait_for_timeout(2000)

        for i in range(NUM_SLIDES):
            # navigate to slide i
            await page.evaluate(f"go({i})")
            # wait for slide transition + animations
            await page.wait_for_timeout(1200)
            out = OUT_DIR / f"slide_{i+1:02d}.png"
            await page.screenshot(path=str(out), clip={"x":0,"y":0,"width":WIDTH,"height":HEIGHT})
            print(f"  slide {i+1:2d} → {out.name}")

        await browser.close()

asyncio.run(capture())
print("Done.")
