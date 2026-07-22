import { test, expect } from '@playwright/test';

const generateMockJWT = () => {
  const payloadObj = {
    email: "farmer@example.com",
    role: "user",
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour in future
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payloadObj))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payloadBase64}.mocksignature`;
};

// Helper function to inject mock authentication details into localStorage and route profiles
const setupMockAuth = async (page) => {
  page.on('requestfailed', request => {
    console.error('E2E_REQUEST_FAILED:', request.url(), request.failure()?.errorText);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('E2E_CONSOLE_ERROR:', msg.text());
    }
  });

  const token = generateMockJWT();
  await page.addInitScript((jwtToken) => {
    window.localStorage.setItem(
      'agriconnect_auth',
      JSON.stringify({ token: jwtToken, userType: 'farmer' })
    );
  }, token);

  // Mock profile response to bypass session validators in routes.tsx
  await page.route('**/api/users/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'farmer-123',
          role: 'user', // resolves to 'farmer'
          email: 'farmer@example.com',
          firstName: 'Nimal',
          lastName: 'Silva',
          nic: '123456789V',
          phone: '0771234567',
          address: '123 Farm Road, Anuradhapura',
          district: 'Anuradhapura',
          division: 'Central',
          points: 120,
          emailVerified: true
        }
      })
    });
  });

  // Mock farms response
  await page.route('**/api/farms', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ farms: [] })
    });
  });

  // Mock harvest history response
  await page.route('**/api/farms/harvests', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ harvests: [] })
    });
  });

  // Mock crops list response
  await page.route('**/api/farms/crops/list', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ crops: [] })
    });
  });

  // Mock disease stats response
  await page.route('**/api/farms/disease-stats**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ stats: [] })
    });
  });

  // Mock inquiries response
  await page.route('**/api/inquiries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // Mock nearby floods response
  await page.route('**/api/flood/nearby', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ floods: [] })
    });
  });

  // Mock reports response
  await page.route('**/api/farms/my-report', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ report: {} })
    });
  });
};

test.describe('AgriConnect - End-To-End (E2E) Test Suite', () => {

  // Test 1: Redirect unauthenticated user to login screen
  test('1. Unauthenticated users are redirected to login', async ({ page }) => {
    await page.goto('/farmer/home');
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  // Test 2: Transition from login to Forgot Password view
  test('2. Can navigate from sign-in to forgot password screen', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Forgot Password?")');
    await expect(page.locator('h2:has-text("Forgot Password")')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter your email"]')).toBeVisible();
  });

  // Test 3: Transition from forgot password back to login
  test('3. Can navigate back to sign-in from forgot password screen', async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Forgot Password?")');
    await page.click('button:has-text("Back to Sign In")');
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('input[placeholder="Enter your password"]')).toBeVisible();
  });

  // Test 4: Authenticated user is redirected to farmer dashboard
  test('4. Authenticated farmer is redirected from root to farmer home dashboard', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/');
    await expect(page).toHaveURL('/farmer/home');
  });

  // Test 5: Verify Home dashboard rendering
  test('5. Farmer home page loads summary cards and details', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/farmer/home');

    // Asserts dashboard layout and greeting
    await expect(page.locator('text=Welcome, Nimal')).toBeVisible();
    await expect(page.locator('text=Total Points:')).toBeVisible();
    await expect(page.locator('text=Account Status')).toBeVisible();
  });

  // Test 6: Verify Crop Data Page elements
  test('6. Crop data page rendering and grid elements', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/farmer/crop-data');

    // Asserts search filters and yield cards
    await expect(page.locator('text=Filters').first()).toBeVisible();
    await expect(page.locator('text=Total Yield')).toBeVisible();
  });

  // Test 7: Verify Disease Heatmap loads Leaflet Map
  test('7. Disease heatmap page renders interactive map containers', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/farmer/disease');

    // Asserts disease panel and Map container
    await expect(page.locator('text=Disease Detection & Analysis')).toBeVisible();
    await expect(page.locator('button:has-text("Analyze Disease")')).toBeVisible();
  });

  // Test 8: Verify Profile modification page
  test('8. Profile page loads active farmer credential fields', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/farmer/profile');

    // Asserts profile inputs and details
    await expect(page.locator('text=Personal Information')).toBeVisible();
    await expect(page.locator('text=Nimal Silva').first()).toBeVisible();
    await expect(page.locator('text=Registered Date')).toBeVisible();
  });

  // Test 9: Verify optimization reports elements
  test('9. Reports page loads analysis charts and projections', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/farmer/reports');

    // Asserts optimization parameters and report widgets
    await expect(page.locator('text=Total Points')).toBeVisible();
    await expect(page.locator('text=Total Acres')).toBeVisible();
  });

  // Test 10: Verify inquiries messaging layout
  test('10. Contact Admin messaging logs and inbox load successfully', async ({ page }) => {
    await setupMockAuth(page);
    await page.goto('/farmer/contact-admin');

    // Asserts contact inbox panels and text boxes
    await expect(page.locator('text=New Report')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="Describe your issue"]')).toBeVisible();
  });
});
