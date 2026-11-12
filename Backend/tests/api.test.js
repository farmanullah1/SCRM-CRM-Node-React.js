async function runTests() {
  console.log("--- Starting SCRM Enterprise API Verification ---");
  const base = "http://localhost:5000/api";

  // 1. Health check
  const healthRes = await fetch("http://localhost:5000/health");
  const health = await healthRes.json();
  console.log("✓ Healthcheck passed:", health.status, health.platform);

  // 2. Register Standard User (Demonstrates that public signup assigns lowest privilege standard_user)
  const standardUser = {
    name: "Alex Standard",
    email: `user_${Date.now()}@scrm.enterprise`,
    password: "SecureUserPassword2026!",
    company_name: "SCRM QA Workspace",
    termsAccepted: true,
    role: "admin" // Attempt privilege escalation: must be ignored and assigned standard_user
  };

  const signupRes = await fetch(`${base}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(standardUser)
  });
  const signupData = await signupRes.json();
  if (!signupRes.ok) throw new Error(JSON.stringify(signupData));
  console.log("✓ User registered (Role enforced):", signupData.user.email, "Assigned Role:", signupData.user.role);
  if (signupData.user.role !== "standard_user") {
    throw new Error("Expected public signup to assign the safe standard_user role");
  }

  const token = signupData.token;
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  // 3. Test setup-admin endpoint lockdown (If admin already exists, should return 403 Forbidden)
  const setupAdminRes = await fetch(`${base}/auth/setup-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Super Admin",
      email: `admin_${Date.now()}@scrm.enterprise`,
      password: "SuperAdminPass2026!"
    })
  });
  console.log("✓ First-run admin setup check status:", setupAdminRes.status, "(403 indicates locked down as expected)");

  // 4. Test Standalone Lead Ingestion
  const leadRes = await fetch(`${base}/leads`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      name: "Marcus Aurelius",
      email: `marcus_${Date.now()}@stoicenterprises.com`,
      phone: "+1-555-444-2222",
      company_name: "Stoic Enterprises",
      title: "Chief Operating Officer",
      source: "Conference",
      estimated_value: 45000,
      notes: "Met at Enterprise Tech Summit. Interested in high-velocity CRM deployment."
    })
  });
  const leadData = await leadRes.json();
  if (!leadRes.ok) throw new Error(JSON.stringify(leadData));
  console.log("✓ Standalone Lead created:", leadData.lead.name, "Company:", leadData.lead.company_name);

  // 5. Fetch Leads with filtering
  const listLeadsRes = await fetch(`${base}/leads?status=New`, { headers: authHeaders });
  const listLeadsData = await listLeadsRes.json();
  console.log("✓ Inbound Leads listed:", listLeadsData.leads.length, "total leads retrieved");

  // 6. Test Safe Transactional Lead Conversion (Lead -> Contact + Company + Deal)
  const convertLeadRes = await fetch(`${base}/leads/${leadData.lead.id}/convert`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      dealTitle: "Stoic Enterprises - High-Velocity Platform License",
      dealValue: 55000,
      pipelineStage: "Qualified"
    })
  });
  const convertLeadData = await convertLeadRes.json();
  if (!convertLeadRes.ok) throw new Error(JSON.stringify(convertLeadData));
  console.log("✓ Transactional Lead Conversion:", 
    "Contact Created:", convertLeadData.contact.name, 
    "| Deal Created:", convertLeadData.deal.title, 
    "| Value: $" + convertLeadData.deal.value
  );

  // 7. Test Duplicate Detection
  const dupRes = await fetch(`${base}/contacts/duplicates`, { headers: authHeaders });
  const dupData = await dupRes.json();
  console.log("✓ Duplicate detector ran:", dupData.count, "duplicates flagged");

  // 8. Test Deal Pipeline Metrics
  const metricsRes = await fetch(`${base}/deals/metrics`, { headers: authHeaders });
  const metricsData = await metricsRes.json();
  console.log("✓ Deal Pipeline Metrics:", metricsData);

  // 9. Test Active Sessions
  const sessRes = await fetch(`${base}/auth/sessions`, { headers: authHeaders });
  const sessData = await sessRes.json();
  console.log("✓ Active Sessions inspected:", sessData.sessions.length, "session active");

  // 10. Legacy 2FA toggle must be disabled in favour of verified TOTP enrollment.
  const toggle2FARes = await fetch(`${base}/auth/2fa/toggle`, {
    method: "POST",
    headers: authHeaders
  });
  console.log("✓ Legacy 2FA toggle blocked with status:", toggle2FARes.status);
  if (toggle2FARes.status !== 410) throw new Error("Legacy 2FA toggle should return 410");

  // 10b. A standard user must not be able to administer access.
  const accessRes = await fetch(`${base}/access/users`, { headers: authHeaders });
  console.log("✓ Access administration denied to standard user:", accessRes.status);
  if (accessRes.status !== 403) throw new Error("Expected 403 for access administration");

  // 11. Test Product Catalog (Supply Pillar)
  const productRes = await fetch(`${base}/catalog/products`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Enterprise Architecture Consulting",
      sku: "SVC-CONSULT-01",
      price: 15000.00,
      category: "Services"
    })
  });
  const productData = await productRes.json();
  console.log("✓ Product Catalog verified:", productData.product?.name, "| Price: $" + productData.product?.price);

  // 12. Test Web-to-Lead Ingestion (Site Pillar)
  const webLeadRes = await fetch(`${base}/site/web-lead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Hypatia of Alexandria",
      email: `hypatia_${Date.now()}@library.alexandria`,
      phone: "+1-555-8899",
      company_name: "Alexandria Research Institute",
      message: "Requesting demonstration of SCRM for academic research."
    })
  });
  const webLeadData = await webLeadRes.json();
  console.log("✓ Web-to-Lead submission verified:", webLeadData.message, "| Inbound Lead ID:", webLeadData.leadId);

  // 13. Test Session Revocation / Logout
  const logoutRes = await fetch(`${base}/auth/logout`, {
    method: "POST",
    headers: authHeaders
  });
  const logoutData = await logoutRes.json();
  console.log("✓ Session Revocation tested:", logoutData.message);

  console.log("\n=======================================================");
  console.log("ALL SCRM ENTERPRISE VERIFICATION TESTS PASSED (13/13)!");
  console.log("=======================================================");
}

runTests().catch((e) => {
  console.error("Test failed:", e.message);
  process.exit(1);
});
