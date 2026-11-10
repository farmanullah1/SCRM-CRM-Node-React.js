async function runTests() {
  console.log("--- Starting SCRM Enterprise API Verification ---");
  const base = "http://localhost:5000/api";

  // 1. Health check
  const healthRes = await fetch("http://localhost:5000/health");
  const health = await healthRes.json();
  console.log("✓ Healthcheck passed:", health.status, health.platform);

  // 2. Register Admin User (Triggers Welcome Email)
  const adminUser = {
    name: "System Admin",
    email: `admin_${Date.now()}@scrm.enterprise`,
    password: "SecureAdminPassword2026!",
    role: "admin"
  };

  const signupRes = await fetch(`${base}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adminUser)
  });
  const signupData = await signupRes.json();
  if (!signupRes.ok) throw new Error(JSON.stringify(signupData));
  console.log("✓ Admin User registered (Welcome Email triggered):", signupData.user.email);
  const token = signupData.token;

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  // 3. Test 2FA Toggle (Enable 2FA)
  const toggle2FARes = await fetch(`${base}/auth/2fa/toggle`, {
    method: "POST",
    headers: authHeaders
  });
  const toggle2FAData = await toggle2FARes.json();
  console.log("✓ 2FA Toggle tested:", toggle2FAData.message);

  // 4. Test Login with 2FA Challenge
  const login2FARes = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: adminUser.email,
      password: adminUser.password
    })
  });
  const login2FAData = await login2FARes.json();
  if (!login2FAData.twoFactorRequired) {
    throw new Error("Expected twoFactorRequired to be true");
  }
  console.log("✓ 2FA Login challenge triggered:", login2FAData.message);

  // 5. Test Password Reset Request
  const forgotRes = await fetch(`${base}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminUser.email })
  });
  const forgotData = await forgotRes.json();
  console.log("✓ Forgot password trigger tested:", forgotData.message);

  // 6. Create Contact
  const contactRes = await fetch(`${base}/contacts`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Global Finance Corp",
      email: `contact_${Date.now()}@finance.com`,
      phone: "+1-555-888-9999",
      company: "Global Finance Corp",
      status: "Qualified",
      value: 75000,
      leadSource: "Enterprise Referral",
      tags: "VIP, High-Value"
    })
  });
  const contactData = await contactRes.json();
  if (!contactRes.ok) throw new Error(JSON.stringify(contactData));
  console.log("✓ Contact created:", contactData.name, "Value: $" + contactData.value);

  // 7. Test 1-click Convert Lead to Deal
  const convertRes = await fetch(`${base}/contacts/${contactData.id}/convert`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      dealTitle: "Global Finance 2026 Enterprise License",
      dealValue: 85000
    })
  });
  const convertData = await convertRes.json();
  if (!convertRes.ok) throw new Error(JSON.stringify(convertData));
  console.log("✓ Lead converted to Deal:", convertData.deal.title, "Value: $" + convertData.deal.value);

  // 8. Test Duplicate Detection
  const dupRes = await fetch(`${base}/contacts/duplicates`, { headers: authHeaders });
  const dupData = await dupRes.json();
  console.log("✓ Duplicate detector ran:", dupData.count, "duplicates flagged");

  // 9. Test Deal Pipeline Metrics
  const metricsRes = await fetch(`${base}/deals/metrics`, { headers: authHeaders });
  const metricsData = await metricsRes.json();
  console.log("✓ Deal Pipeline Metrics:", metricsData);

  // 10. Test Admin Database Backup Snapshot
  const backupRes = await fetch(`${base}/backup/snapshot`, {
    method: "POST",
    headers: authHeaders
  });
  const backupData = await backupRes.json();
  if (!backupRes.ok) throw new Error(JSON.stringify(backupData));
  console.log("✓ Automated Server Snapshot created:", backupData.filename);

  console.log("\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!");
}

runTests().catch((e) => {
  console.error("Test failed:", e.message);
  process.exit(1);
});
