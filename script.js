"use strict";

/* IDOGWU FAMILY DATABASE — complete script.js
   Age and education are optional. Email and occupation are not member fields.
   Payment history is stored separately in public.idogwu_payment_history. */

const SUPABASE_URL = "https://hzqawunnchuryzgmgiwi.supabase.co";
const SUPABASE_KEY = "sb_publishable_IBjtMX_HXiG1drNw8MksRg_PtddAlBa";

if (!window.supabase?.createClient) {
  throw new Error("Supabase JS v2 is not loaded. Load the Supabase CDN before script.js.");
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentRole = "member";
let currentUsername = "";
let allMembers = [];
let allPaymentRecords = [];
let paymentDashboardError = false;
let activeHistoryMemberId = null;

const $ = (id) => document.getElementById(id);

const adminLoginBox = $("adminLoginBox");
const adminApplication = $("adminApplication");
const adminEmail = $("adminEmail");
const adminPassword = $("adminPassword");
const adminLoginButton = $("adminLoginButton");
const forgotPasswordButton = $("forgotPasswordButton");
const loginMessage = $("loginMessage");
const logoutButton = $("logoutButton");
const loggedInUser = $("loggedInUser");

const memberId = $("memberId");
const fullName = $("fullName");
const phone = $("phone");
const locationInput = $("location");
const gender = $("gender");
const age = $("age");
const education = $("education");
const maritalStatus = $("marital_status");
const amount = $("amount");
const purpose = $("purpose");
const saveMemberButton = $("saveMemberButton");
const clearFormButton = $("clearFormButton");
const memberMessage = $("memberMessage");

const searchInput = $("searchInput");
const refreshButton = $("refreshButton");
const exportButton = $("exportButton");
const membersTableBody = $("membersTableBody");

const totalMembers = $("totalMembers");
const paidMembers = $("paidMembers");
const unpaidMembers = $("unpaidMembers");
const totalAmount = $("totalAmount");
const averageAmount = $("averageAmount");
const totalLocations = $("totalLocations");
const locationStatistics = $("locationStatistics");

const forgotPasswordBox = $("forgotPasswordBox");
const recoveryEmail = $("recoveryEmail");
const sendRecoveryButton = $("sendRecoveryButton");
const recoveryMessage = $("recoveryMessage");
const closeForgotPassword = $("closeForgotPassword");

const passwordResetBox = $("passwordResetBox");
const newAdminPassword = $("newAdminPassword");
const confirmAdminPassword = $("confirmAdminPassword");
const saveNewPassword = $("saveNewPassword");
const resetMessage = $("resetMessage");

const paymentHistoryBox = $("paymentHistoryBox");
const paymentHistoryMemberName = $("paymentHistoryMemberName");
const paymentHistoryTotal = $("paymentHistoryTotal");
const paymentHistoryMessage = $("paymentHistoryMessage");
const paymentHistoryBody = $("paymentHistoryBody");
const paymentForm = $("paymentForm");
const paymentId = $("paymentId");
const paymentAmount = $("paymentAmount");
const paymentDate = $("paymentDate");
const paymentPurpose = $("paymentPurpose");
const paymentNotes = $("paymentNotes");
const savePaymentButton = $("savePaymentButton");
const cancelPaymentEdit = $("cancelPaymentEdit");
const paymentActionsHeading = $("paymentActionsHeading");
const closePaymentHistory = $("closePaymentHistory");

if (adminApplication) adminApplication.style.display = "none";
if (adminLoginBox) adminLoginBox.style.display = "block";
if (paymentHistoryBox) paymentHistoryBox.style.display = "none";

document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await checkExistingSession();
});

function setupEventListeners() {
  adminLoginButton?.addEventListener("click", loginUser);
  logoutButton?.addEventListener("click", logoutUser);

  saveMemberButton?.addEventListener("click", saveMember);
  clearFormButton?.addEventListener("click", clearMemberForm);

  refreshButton?.addEventListener("click", loadMembers);
  searchInput?.addEventListener("input", renderMembers);
  exportButton?.addEventListener("click", exportCSV);

  forgotPasswordButton?.addEventListener("click", openForgotPassword);
  closeForgotPassword?.addEventListener("click", closeForgotPasswordBox);
  sendRecoveryButton?.addEventListener("click", sendPasswordRecovery);
  saveNewPassword?.addEventListener("click", updatePassword);

  adminPassword?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginUser();
  });

  recoveryEmail?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendPasswordRecovery();
  });

  membersTableBody?.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-action]");
    if (!button || !membersTableBody.contains(button)) return;

    const id = button.dataset.id;
    if (!id) return;

    if (button.dataset.action === "history") openPaymentHistory(id);
    else if (button.dataset.action === "edit") editMember(id);
    else if (button.dataset.action === "delete") deleteMember(id);
  });

  paymentForm?.addEventListener("submit", savePayment);
  cancelPaymentEdit?.addEventListener("click", resetPaymentForm);
  closePaymentHistory?.addEventListener("click", closePaymentHistoryModal);

  paymentHistoryBody?.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-payment-action]");
    if (!button || !paymentHistoryBody.contains(button)) return;

    if (!isAdmin()) {
      return alert("Only administrators can change payment records.");
    }

    if (button.dataset.paymentAction === "edit") {
      editPaymentRecord(button.dataset.id);
    }

    if (button.dataset.paymentAction === "delete") {
      deletePaymentRecord(button.dataset.id);
    }
  });

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      currentUser = session?.user || null;
      showPasswordReset();
    }

    if (event === "SIGNED_OUT") {
      currentUser = null;
      currentRole = "member";
      currentUsername = "";
      allMembers = [];
      closePaymentHistoryModal();
      showLoginScreen();
    }
  });
}

async function checkExistingSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    if (data?.session?.user) {
      currentUser = data.session.user;
      await startApplication();
    } else {
      showLoginScreen();
    }
  } catch (error) {
    console.error("Session check:", error);
    showLoginScreen();
  }
}

async function loginUser() {
  const email = adminEmail?.value.trim() || "";
  const password = adminPassword?.value || "";

  if (!email || !password) {
    return showLoginMessage("Please enter your email and password.", "error");
  }

  if (adminLoginButton) adminLoginButton.disabled = true;
  showLoginMessage("Signing in...", "info");

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    currentUser = data.user;
    if (adminPassword) adminPassword.value = "";

    await startApplication();
  } catch (error) {
    console.error("Login:", error);
    showLoginMessage(
      error.message || "Unable to sign in. Please try again.",
      "error"
    );
  } finally {
    if (adminLoginButton) adminLoginButton.disabled = false;
  }
}

async function startApplication() {
  if (!currentUser) return showLoginScreen();

  await loadUserRole(currentUser.id);
  showApplication();
  await loadMembers();
}

async function loadUserRole(userId) {
  currentRole = "member";
  currentUsername = currentUser?.email || "";

  try {
    const { data, error } = await supabaseClient
      .from("user_roles")
      .select("role, username")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      currentRole = String(data.role || "member").toLowerCase();
      if (data.username) currentUsername = data.username;
    }
  } catch (error) {
    console.error("Role lookup:", error);
    showLoginMessage(
      "Your role could not be verified. Some features may be unavailable.",
      "error"
    );
  }

  applyPermissions();
}

function isAdmin() {
  return currentRole === "admin";
}

function applyPermissions() {
  const section = $("memberRegistrationSection");

  if (section) section.style.display = isAdmin() ? "block" : "none";
  if (exportButton) exportButton.style.display = isAdmin() ? "inline-block" : "none";
  if (paymentForm) paymentForm.style.display = isAdmin() ? "block" : "none";
  if (paymentActionsHeading) paymentActionsHeading.style.display = isAdmin() ? "" : "none";
}

function showApplication() {
  if (adminLoginBox) adminLoginBox.style.display = "none";
  if (adminApplication) adminApplication.style.display = "block";

  if (loggedInUser) {
    loggedInUser.textContent = `Logged in as: ${currentUsername} (${currentRole})`;
  }
}

function showLoginScreen() {
  if (adminApplication) adminApplication.style.display = "none";
  if (adminLoginBox) adminLoginBox.style.display = "block";
  if (adminEmail) adminEmail.value = "";
  if (adminPassword) adminPassword.value = "";
  showLoginMessage("", "");
}

async function logoutUser() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Logout:", error);
    alert("There was a problem signing out. Please try again.");
    return;
  }

  currentUser = null;
  currentRole = "member";
  currentUsername = "";
  allMembers = [];

  clearMemberForm();
  closePaymentHistoryModal();
  showLoginScreen();
}

async function loadMembers() {
  if (!currentUser) return;

  if (membersTableBody) {
    membersTableBody.innerHTML =
      '<tr><td colspan="12" class="table-message">Loading members...</td></tr>';
  }

  try {
    const { data, error } = await supabaseClient
      .from("idogwu_members")
      .select(
        "id, full_name, phone, location, gender, age, education, marital_status, amount, purpose, created_at"
      )
      .order("full_name", { ascending: true });

    if (error) throw error;

    allMembers = data || [];
    await refreshPaymentDashboard();
    renderMembers();
    renderLocationStatistics();
  } catch (error) {
    console.error("Load members:", error);

    if (membersTableBody) {
      membersTableBody.innerHTML =
        `<tr><td colspan="12" class="table-message">Unable to load members: ${escapeHTML(error.message || "Unknown error")}</td></tr>`;
    }
  }
}

async function refreshPaymentDashboard() {
  try {
    // Dashboard contribution figures come from payment history only.
    const { data, error } = await supabaseClient
      .from("idogwu_payment_history")
      .select("member_id, amount");

    if (error) throw error;

    allPaymentRecords = data || [];
    paymentDashboardError = false;
  } catch (error) {
    console.error("Load dashboard payment totals:", error);
    allPaymentRecords = [];
    paymentDashboardError = true;
  }

  updateDashboard();
}

function updateDashboard() {
  const total = allMembers.length;
  let sum = 0;

  const paidMemberIds = new Set();
  const locations = new Set();

  allPaymentRecords.forEach((payment) => {
    const value = Number(payment.amount || 0);

    if (Number.isFinite(value)) sum += value;
    if (value > 0) paidMemberIds.add(String(payment.member_id));
  });

  const paid = allMembers.filter((member) =>
    paidMemberIds.has(String(member.id))
  ).length;

  const unpaid = Math.max(0, total - paid);

  allMembers
    .map((member) => String(member.location || "").trim())
    .filter(Boolean)
    .forEach((location) => locations.add(location.toLowerCase()));

  if (totalMembers) totalMembers.textContent = total;
  if (paidMembers) paidMembers.textContent = paymentDashboardError ? "—" : paid;
  if (unpaidMembers) unpaidMembers.textContent = paymentDashboardError ? "—" : unpaid;
  if (totalAmount) {
    totalAmount.textContent = paymentDashboardError ? "Unable to load" : formatCurrency(sum);
  }
  if (averageAmount) {
    averageAmount.textContent = paymentDashboardError
      ? "Unable to load"
      : formatCurrency(allPaymentRecords.length ? sum / allPaymentRecords.length : 0);
  }
  if (totalLocations) totalLocations.textContent = locations.size;
}

function memberMatchesSearch(member, term) {
  return [
    member.full_name,
    member.phone,
    member.location,
    member.gender,
    member.age,
    member.education,
    member.marital_status,
    member.amount,
    member.purpose
  ].some((value) => String(value ?? "").toLowerCase().includes(term));
}

function renderMembers() {
  if (!membersTableBody) return;

  const term = String(searchInput?.value || "").trim().toLowerCase();
  const list = term
    ? allMembers.filter((member) => memberMatchesSearch(member, term))
    : allMembers;

  if (!list.length) {
    membersTableBody.innerHTML =
      '<tr><td colspan="12" class="table-message">No members found.</td></tr>';
    return;
  }

  membersTableBody.innerHTML = "";

  list.forEach((member, index) => {
    const row = document.createElement("tr");

    const actions = `
      <div class="action-buttons">
        <button type="button" class="btn btn-primary"
          data-action="history" data-id="${escapeHTML(member.id)}">
          View History
        </button>
        ${
          isAdmin()
            ? `
              <button type="button" class="btn btn-warning"
                data-action="edit" data-id="${escapeHTML(member.id)}">
                Edit
              </button>
              <button type="button" class="btn btn-danger"
                data-action="delete" data-id="${escapeHTML(member.id)}">
                Delete
              </button>
            `
            : ""
        }
      </div>
    `;

    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHTML(member.full_name)}</td>
      <td>${escapeHTML(member.phone)}</td>
      <td>${escapeHTML(member.location)}</td>
      <td>${escapeHTML(member.gender)}</td>
      <td>${escapeHTML(member.age ?? "")}</td>
      <td>${escapeHTML(member.education ?? "")}</td>
      <td>${escapeHTML(member.marital_status)}</td>
      <td>${formatCurrency(member.amount || 0)}</td>
      <td>${escapeHTML(member.purpose ?? "")}</td>
      <td>${formatDate(member.created_at)}</td>
      <td>${actions}</td>
    `;

    membersTableBody.appendChild(row);
  });
}

function renderLocationStatistics() {
  if (!locationStatistics) return;

  locationStatistics.innerHTML = "";

  if (!allMembers.length) {
    locationStatistics.innerHTML =
      '<div class="table-message">No location statistics available.</div>';
    return;
  }

  const counts = {};

  allMembers.forEach((member) => {
    const name = String(member.location || "").trim() || "Location Not Provided";
    const key = name.toLowerCase();

    if (!counts[key]) counts[key] = { name, count: 0 };
    counts[key].count++;
  });

  Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .forEach((item) => {
      const card = document.createElement("div");
      card.className = "location-card";

      const name = document.createElement("div");
      name.className = "location-name";
      name.textContent = item.name;

      const count = document.createElement("div");
      count.className = "location-count";
      count.textContent = `${item.count} ${item.count === 1 ? "Member" : "Members"}`;

      card.append(name, count);
      locationStatistics.appendChild(card);
    });
}
async function saveMember() {
  if (!isAdmin()) {
    return showMemberMessage(
      "You do not have permission to add or edit members.",
      "error"
    );
  }

  const name = fullName?.value.trim() || "";
  const tel = phone?.value.trim() || "";
  const loc = locationInput?.value.trim() || "";
  const sex = gender?.value || "";
  const ageText = age?.value.trim() || "";
  const edu = education?.value.trim() || "";
  const marital = maritalStatus?.value || "";
  const amountText = amount?.value.trim() || "";
  const sum = amountText === "" ? 0 : Number(amountText);
  const reason = purpose?.value.trim() || "";

  if (!fullName || !phone || !locationInput || !gender || !maritalStatus) {
    return showMemberMessage(
      "Some required form elements are missing from index.html.",
      "error"
    );
  }

  if (!name) {
    showMemberMessage("Please enter the member's full name.", "error");
    return fullName.focus();
  }

  if (!tel) {
    showMemberMessage("Please enter the member's phone number.", "error");
    return phone.focus();
  }

  if (!loc) {
    showMemberMessage("Please enter the member's location.", "error");
    return locationInput.focus();
  }

  if (!sex) {
    showMemberMessage("Please select the member's gender.", "error");
    return gender.focus();
  }

  // Age is optional.
  let ageValue = null;

  if (ageText !== "") {
    ageValue = Number(ageText);

    if (!Number.isInteger(ageValue) || ageValue < 1 || ageValue > 120) {
      showMemberMessage(
        "Enter an age between 1 and 120, or leave it blank.",
        "error"
      );
      return age?.focus();
    }
  }

  // Education is optional.
  if (!marital) {
    showMemberMessage("Please select the marital status.", "error");
    return maritalStatus.focus();
  }

  if (!Number.isFinite(sum) || sum < 0) {
    showMemberMessage("Please enter a valid contribution amount.", "error");
    return amount?.focus();
  }

  const editing = Boolean(memberId?.value);

  if (saveMemberButton) saveMemberButton.disabled = true;

  showMemberMessage(
    editing ? "Updating member..." : "Saving member...",
    "info"
  );

  try {
    const record = {
      full_name: name,
      phone: tel,
      location: loc,
      gender: sex,
      age: ageValue,
      education: edu || null,
      marital_status: marital,
      amount: sum,
      purpose: reason || null
    };

    const result = editing
      ? await supabaseClient
          .from("idogwu_members")
          .update(record)
          .eq("id", memberId.value)
          .select("id")
      : await supabaseClient
          .from("idogwu_members")
          .insert(record)
          .select("id");

    if (result.error) throw result.error;

    if (editing && !result.data?.length) {
      throw new Error("No member was updated. Check Supabase permissions.");
    }

    clearMemberForm();
    await loadMembers();

    showMemberMessage(
      editing
        ? "Member information updated successfully."
        : "Member added successfully.",
      "success"
    );
  } catch (error) {
    console.error("Save member:", error);
    showMemberMessage(
      `Unable to save member: ${error.message || error}`,
      "error"
    );
  } finally {
    if (saveMemberButton) saveMemberButton.disabled = false;
  }
}

function editMember(id) {
  if (!isAdmin()) {
    return alert("You do not have permission to edit members.");
  }

  const member = allMembers.find((item) => String(item.id) === String(id));

  if (!member) {
    return alert("Member not found. Please refresh and try again.");
  }

  if (memberId) memberId.value = member.id;
  if (fullName) fullName.value = member.full_name || "";
  if (phone) phone.value = member.phone || "";
  if (locationInput) locationInput.value = member.location || "";
  if (gender) gender.value = member.gender || "";
  if (age) age.value = member.age ?? "";
  if (education) education.value = member.education || "";
  if (maritalStatus) maritalStatus.value = member.marital_status || "";
  if (amount) amount.value = member.amount ?? 0;
  if (purpose) purpose.value = member.purpose || "";

  if (saveMemberButton) {
    saveMemberButton.textContent = "Update Member";
    saveMemberButton.disabled = false;
  }

  showMemberMessage(
    `Editing ${member.full_name || "member"}. Make changes, then click Update Member.`,
    "info"
  );

  $("memberRegistrationSection")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  fullName?.focus();
}

async function deleteMember(id) {
  if (!isAdmin()) {
    return alert("You do not have permission to delete members.");
  }

  const member = allMembers.find((item) => String(item.id) === String(id));

  if (!member) {
    return alert("Member not found. Please refresh and try again.");
  }

  if (!confirm(
    `Delete ${member.full_name || "this member"}? Related payment history may also be deleted by the database foreign-key rule.`
  )) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("idogwu_members")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) throw error;

    if (!data?.length) {
      throw new Error("No member was deleted. Check Supabase permissions.");
    }

    if (String(memberId?.value) === String(id)) clearMemberForm();

    if (String(activeHistoryMemberId) === String(id)) {
      closePaymentHistoryModal();
    }

    await loadMembers();
    alert("Member deleted successfully.");
  } catch (error) {
    console.error("Delete member:", error);
    alert(`Unable to delete member: ${error.message || error}`);
  }
}

function clearMemberForm() {
  [
    memberId,
    fullName,
    phone,
    locationInput,
    gender,
    age,
    education,
    maritalStatus,
    amount,
    purpose
  ].forEach((element) => {
    if (element) element.value = "";
  });

  if (saveMemberButton) {
    saveMemberButton.textContent = "Save Member";
    saveMemberButton.disabled = false;
  }

  if (memberMessage) {
    memberMessage.textContent = "";
    memberMessage.className = "message";
  }
}

function exportCSV() {
  if (!isAdmin()) {
    return alert("Only administrators can export member data.");
  }

  if (!allMembers.length) {
    return alert("There are no members to export.");
  }

  const term = String(searchInput?.value || "").trim().toLowerCase();

  const list = term
    ? allMembers.filter((member) => memberMatchesSearch(member, term))
    : allMembers;

  if (!list.length) {
    return alert("There are no matching members to export.");
  }

  const headers = [
    "S/N",
    "Full Name",
    "Phone",
    "Location",
    "Gender",
    "Age",
    "Educational Qualification",
    "Marital Status",
    "Amount",
    "Purpose",
    "Date"
  ];

  const rows = list.map((member, index) => [
    index + 1,
    member.full_name || "",
    member.phone || "",
    member.location || "",
    member.gender || "",
    member.age ?? "",
    member.education || "",
    member.marital_status || "",
    Number(member.amount || 0).toFixed(2),
    member.purpose || "",
    formatDate(member.created_at)
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((value) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`
      ).join(",")
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "idogwu_family_members.csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/* -------------------- PAYMENT HISTORY -------------------- */

function localDateInputValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

function showPaymentMessage(message, type = "info") {
  setMessage(paymentHistoryMessage, message, type);
}

function resetPaymentForm() {
  if (paymentId) paymentId.value = "";
  if (paymentAmount) paymentAmount.value = "";
  if (paymentDate) paymentDate.value = localDateInputValue();
  if (paymentPurpose) paymentPurpose.value = "";
  if (paymentNotes) paymentNotes.value = "";

  if (savePaymentButton) {
    savePaymentButton.textContent = "Save Payment";
    savePaymentButton.disabled = false;
  }

  if (cancelPaymentEdit) {
    cancelPaymentEdit.style.display = "none";
  }
}

function openPaymentHistory(id) {
  if (!currentUser) {
    return alert("Please sign in to view payment history.");
  }

  if (!paymentHistoryBox || !paymentHistoryBody) {
    return alert(
      "Payment history modal is missing from index.html. Add the payment-history modal markup first."
    );
  }

  const member = allMembers.find((item) => String(item.id) === String(id));

  if (!member) {
    return alert("Member not found. Please refresh and try again.");
  }

  activeHistoryMemberId = member.id;

  if (paymentHistoryMemberName) {
    paymentHistoryMemberName.textContent =
      `Payment History — ${member.full_name || "Family Member"}`;
  }

  if (paymentHistoryTotal) {
    paymentHistoryTotal.textContent = formatCurrency(0);
  }

  if (paymentForm) {
    paymentForm.style.display = isAdmin() ? "block" : "none";
  }

  if (paymentActionsHeading) {
    paymentActionsHeading.style.display = isAdmin() ? "" : "none";
  }

  resetPaymentForm();
  showPaymentMessage("", "");

  paymentHistoryBox.style.display = "flex";
  loadPaymentHistory();
}

function closePaymentHistoryModal() {
  if (paymentHistoryBox) paymentHistoryBox.style.display = "none";

  activeHistoryMemberId = null;

  resetPaymentForm();
  showPaymentMessage("", "");
}

async function loadPaymentHistory() {
  if (!currentUser || activeHistoryMemberId == null || !paymentHistoryBody) {
    return;
  }

  const memberKey = activeHistoryMemberId;
  const admin = isAdmin();
  const columns = admin ? 6 : 5;

  paymentHistoryBody.innerHTML =
    `<tr><td colspan="${columns}" class="table-message">Loading payment history...</td></tr>`;

  try {
    const { data, error } = await supabaseClient
      .from("idogwu_payment_history")
      .select("id, member_id, amount, payment_date, purpose, notes, created_at")
      .eq("member_id", memberKey)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (String(activeHistoryMemberId) !== String(memberKey)) return;

    const list = data || [];

    const sum = list.reduce(
      (total, payment) => total + Number(payment.amount || 0),
      0
    );

    if (paymentHistoryTotal) {
      paymentHistoryTotal.textContent = formatCurrency(sum);
    }

    if (!list.length) {
      paymentHistoryBody.innerHTML =
        `<tr><td colspan="${columns}" class="table-message">No payment history has been recorded for this member yet.</td></tr>`;

      showPaymentMessage("No payments recorded yet.", "info");
      return;
    }

    paymentHistoryBody.innerHTML = "";

    list.forEach((payment, index) => {
      const row = document.createElement("tr");

      const actions = admin
        ? `
          <td>
            <div class="action-buttons">
              <button type="button"
                class="btn btn-warning"
                data-payment-action="edit"
                data-id="${escapeHTML(payment.id)}">
                Edit
              </button>

              <button type="button"
                class="btn btn-danger"
                data-payment-action="delete"
                data-id="${escapeHTML(payment.id)}">
                Delete
              </button>
            </div>
          </td>
        `
        : "";

      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${formatDate(payment.payment_date)}</td>
        <td>${formatCurrency(payment.amount)}</td>
        <td>${escapeHTML(payment.purpose)}</td>
        <td>${escapeHTML(payment.notes || "")}</td>
        ${actions}
      `;

      paymentHistoryBody.appendChild(row);
    });

    showPaymentMessage("", "");
  } catch (error) {
    console.error("Load payment history:", error);

    paymentHistoryBody.innerHTML =
      `<tr><td colspan="${columns}" class="table-message">Unable to load payment history: ${escapeHTML(error.message || "Unknown error")}</td></tr>`;

    showPaymentMessage(
      `Unable to load payment history: ${error.message || error}`,
      "error"
    );
  }
}

async function savePayment(event) {
  event?.preventDefault();

  if (!isAdmin()) {
    return showPaymentMessage(
      "Only administrators can add or edit payment records.",
      "error"
    );
  }

  if (activeHistoryMemberId == null) {
    return showPaymentMessage(
      "Open a member's payment history first.",
      "error"
    );
  }

  const amountText = paymentAmount?.value.trim() || "";
  const sum = Number(amountText);
  const date = paymentDate?.value || "";
  const reason = paymentPurpose?.value.trim() || "";
  const notes = paymentNotes?.value.trim() || "";
  const editing = Boolean(paymentId?.value);

  if (!amountText || !Number.isFinite(sum) || sum <= 0) {
    showPaymentMessage(
      "Enter a valid payment amount greater than zero.",
      "error"
    );
    return paymentAmount?.focus();
  }

  if (!date) {
    showPaymentMessage("Please select the payment date.", "error");
    return paymentDate?.focus();
  }

  if (!reason) {
    showPaymentMessage("Please enter the payment purpose.", "error");
    return paymentPurpose?.focus();
  }

  if (savePaymentButton) savePaymentButton.disabled = true;

  showPaymentMessage(
    editing ? "Updating payment..." : "Saving payment...",
    "info"
  );

  try {
    const record = {
      member_id: activeHistoryMemberId,
      amount: sum,
      payment_date: date,
      purpose: reason,
      notes: notes || null
    };

    const result = editing
      ? await supabaseClient
          .from("idogwu_payment_history")
          .update(record)
          .eq("id", paymentId.value)
          .eq("member_id", activeHistoryMemberId)
          .select("id")
      : await supabaseClient
          .from("idogwu_payment_history")
          .insert(record)
          .select("id");

    if (result.error) throw result.error;

    if (!result.data?.length) {
      throw new Error(
        "No payment was saved. Check Supabase permissions and table policies."
      );
    }

    resetPaymentForm();

    showPaymentMessage(
      editing
        ? "Payment updated successfully."
        : "Payment recorded successfully.",
      "success"
    );

    // Refresh general dashboard totals after saving a payment.
    await refreshPaymentDashboard();
    await loadPaymentHistory();
  } catch (error) {
    console.error("Save payment:", error);

    showPaymentMessage(
      `Unable to save payment: ${error.message || error}`,
      "error"
    );
  } finally {
    if (savePaymentButton) savePaymentButton.disabled = false;
  }
}

async function editPaymentRecord(id) {
  if (!isAdmin()) {
    return alert("Only administrators can edit payment records.");
  }

  if (activeHistoryMemberId == null) return;

  try {
    const { data, error } = await supabaseClient
      .from("idogwu_payment_history")
      .select("id, member_id, amount, payment_date, purpose, notes")
      .eq("id", id)
      .eq("member_id", activeHistoryMemberId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Payment record not found.");

    if (paymentId) paymentId.value = data.id;
    if (paymentAmount) paymentAmount.value = data.amount;
    if (paymentDate) {
      paymentDate.value = data.payment_date || localDateInputValue();
    }
    if (paymentPurpose) paymentPurpose.value = data.purpose || "";
    if (paymentNotes) paymentNotes.value = data.notes || "";

    if (savePaymentButton) {
      savePaymentButton.textContent = "Update Payment";
    }

    if (cancelPaymentEdit) {
      cancelPaymentEdit.style.display = "inline-block";
    }

    showPaymentMessage(
      "Editing payment record. Make changes and click Update Payment.",
      "info"
    );

    paymentAmount?.focus();
  } catch (error) {
    console.error("Edit payment:", error);

    showPaymentMessage(
      `Unable to open payment record: ${error.message || error}`,
      "error"
    );
  }
}

async function deletePaymentRecord(id) {
  if (!isAdmin()) {
    return alert("Only administrators can delete payment records.");
  }

  if (activeHistoryMemberId == null) return;

  if (!confirm(
    "Are you sure you want to delete this payment record? This cannot be undone."
  )) {
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("idogwu_payment_history")
      .delete()
      .eq("id", id)
      .eq("member_id", activeHistoryMemberId)
      .select("id");

    if (error) throw error;

    if (!data?.length) {
      throw new Error("No payment was deleted. Check Supabase permissions.");
    }

    resetPaymentForm();
    showPaymentMessage("Payment deleted successfully.", "success");

    // Refresh general dashboard totals after deleting a payment.
    await refreshPaymentDashboard();
    await loadPaymentHistory();
  } catch (error) {
    console.error("Delete payment:", error);

    showPaymentMessage(
      `Unable to delete payment: ${error.message || error}`,
      "error"
    );
  }
}

/* -------------------- PASSWORD RECOVERY / RESET -------------------- */

function openForgotPassword() {
  if (!forgotPasswordBox) return;

  forgotPasswordBox.style.display = "flex";

  if (recoveryEmail) {
    recoveryEmail.value = "";
    recoveryEmail.focus();
  }

  showRecoveryMessage("", "");
}

function closeForgotPasswordBox() {
  if (forgotPasswordBox) {
    forgotPasswordBox.style.display = "none";
  }
}

async function sendPasswordRecovery() {
  const email = recoveryEmail?.value.trim() || "";

  if (!email) {
    return showRecoveryMessage(
      "Please enter your registered administrator email address.",
      "error"
    );
  }

  if (sendRecoveryButton) sendRecoveryButton.disabled = true;

  showRecoveryMessage("Sending password recovery email...", "info");

  try {
    const redirectTo = window.location.origin + window.location.pathname;

    const { error } = await supabaseClient.auth.resetPasswordForEmail(
      email,
      { redirectTo }
    );

    if (error) throw error;

    showRecoveryMessage(
      "Password recovery email sent. Please check your email.",
      "success"
    );
  } catch (error) {
    console.error("Recovery:", error);

    showRecoveryMessage(
      error.message || "Unable to send recovery email.",
      "error"
    );
  } finally {
    if (sendRecoveryButton) sendRecoveryButton.disabled = false;
  }
}

function showPasswordReset() {
  if (passwordResetBox) passwordResetBox.style.display = "flex";

  if (newAdminPassword) newAdminPassword.value = "";
  if (confirmAdminPassword) confirmAdminPassword.value = "";

  showResetMessage("", "");
}

async function updatePassword() {
  const password = newAdminPassword?.value || "";
  const confirmPassword = confirmAdminPassword?.value || "";

  if (!password) {
    return showResetMessage("Please enter a new password.", "error");
  }

  if (password.length < 6) {
    return showResetMessage(
      "Password must be at least 6 characters.",
      "error"
    );
  }

  if (password !== confirmPassword) {
    return showResetMessage("The passwords do not match.", "error");
  }

  if (saveNewPassword) saveNewPassword.disabled = true;

  showResetMessage("Updating password...", "info");

  try {
    const { error } = await supabaseClient.auth.updateUser({
      password
    });

    if (error) throw error;

    showResetMessage("Password updated successfully.", "success");

    if (newAdminPassword) newAdminPassword.value = "";
    if (confirmAdminPassword) confirmAdminPassword.value = "";

    setTimeout(() => {
      if (passwordResetBox) passwordResetBox.style.display = "none";
    }, 2000);
  } catch (error) {
    console.error("Password update:", error);

    showResetMessage(
      error.message || "Unable to update password.",
      "error"
    );
  } finally {
    if (saveNewPassword) saveNewPassword.disabled = false;
  }
}

/* -------------------- UTILITIES -------------------- */

function setMessage(element, message, type) {
  if (!element) return;

  element.textContent = message;
  element.className = "message";

  element.style.color =
    type === "error"
      ? "#c62828"
      : type === "success"
        ? "#126b35"
        : "#666";
}

function showLoginMessage(message, type) {
  setMessage(loginMessage, message, type);
}

function showMemberMessage(message, type) {
  setMessage(memberMessage, message, type);
}

function showRecoveryMessage(message, type) {
  setMessage(recoveryMessage, message, type);
}

function showResetMessage(message, type) {
  setMessage(resetMessage, message, type);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "";

  let date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [year, month, day] = String(value).split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function escapeHTML(value) {
  if (value == null) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Make functions available to HTML and table buttons.
window.editMember = editMember;
window.deleteMember = deleteMember;
window.openPaymentHistory = openPaymentHistory;
window.loadPaymentHistory = loadPaymentHistory;
window.closePaymentHistoryModal = closePaymentHistoryModal;
