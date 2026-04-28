import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        # The app runs on 8080
        await page.goto("http://localhost:8080/dashboard/rede-neural")
        await asyncio.sleep(5)
        await page.screenshot(path="verification/pentagon_dashboard.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
