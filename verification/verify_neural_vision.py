from playwright.sync_api import sync_playwright
import time

def verify_vision():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Navigating to http://localhost:8080/consulta...")
        try:
            page.goto("http://localhost:8080/consulta")
            time.sleep(10) # Heavy page load

            # Check if we are on the login page due to AuthGuard
            if "auth" in page.url:
                print("Redirected to auth, taking screenshot of login...")
            else:
                print("On consulta page, taking screenshot...")

            page.screenshot(path="verification/neural_vision.png")
            print("Screenshot saved to verification/neural_vision.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_vision()
