
"use strict";

// =========================================================
// IDOGWU FAMILY DATABASE
// COMPLETE SCRIPT.JS
// Email and Occupation removed from member interface
// Age and Education are optional
// =========================================================


// =========================================================
// SUPABASE CONFIGURATION
// =========================================================

const SUPABASE_URL =
    "https://hzqawunnchuryzgmgiwi.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_IBjtMX_HXiG1drNw8MksRg_PtddAlBa";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =========================================================
// GLOBAL VARIABLES
// =========================================================

let currentUser = null;
let currentRole = "member";
let currentUsername = "";
let allMembers = [];


// =========================================================
// PAGE ELEMENTS
// =========================================================

const adminLoginBox = document.getElementById("adminLoginBox");
const adminApplication = document.getElementById("adminApplication");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const adminLoginButton = document.getElementById("adminLoginButton");
const forgotPasswordButton = document.getElementById("forgotPasswordButton");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");
const loggedInUser = document.getElementById("loggedInUser");


// =========================================================
// MEMBER FORM ELEMENTS
// =========================================================

const memberId = document.getElementById("memberId");
const fullName = document.getElementById("fullName");
const phone = document.getElementById("phone");
const locationInput = document.getElementById("location");
const gender = document.getElementById("gender");
const age = document.getElementById("age");
const education = document.getElementById("education");
const maritalStatus = document.getElementById("marital_status");
const amount = document.getElementById("amount");
const purpose = document.getElementById("purpose");
const saveMemberButton = document.getElementById("saveMemberButton");
const clearFormButton = document.getElementById("clearFormButton");
const memberMessage = document.getElementById("memberMessage");


// =========================================================
// DATABASE ELEMENTS
// =========================================================

const searchInput = document.getElementById("searchInput");
const refreshButton = document.getElementById("refreshButton");
const exportButton = document.getElementById("exportButton");
const membersTableBody = document.getElementById("membersTableBody");

const paymentHistoryBox =
    document.getElementById("paymentHistoryBox");

const paymentHistoryMemberName =
    document.getElementById("paymentHistoryMemberName");

const paymentHistoryTotal =
    document.getElementById("paymentHistoryTotal");

const paymentHistoryMessage =
    document.getElementById("paymentHistoryMessage");

const paymentHistoryBody =
    document.getElementById("paymentHistoryBody");

const paymentForm =
    document.getElementById("paymentForm");

const paymentId =
    document.getElementById("paymentId");

const paymentAmount =
    document.getElementById("paymentAmount");

const paymentDate =
    document.getElementById("paymentDate");

const paymentPurpose =
    document.getElementById("paymentPurpose");

const paymentNotes =
    document.getElementById("paymentNotes");

const savePaymentButton =
    document.getElementById("savePaymentButton");

const cancelPaymentEdit =
    document.getElementById("cancelPaymentEdit");

let activeHistoryMemberId = null;


// =========================================================
// DASHBOARD ELEMENTS
// =========================================================

const totalMembers = document.getElementById("totalMembers");
const paidMembers = document.getElementById("paidMembers");
const unpaidMembers = document.getElementById("unpaidMembers");
const totalAmount = document.getElementById("totalAmount");
const averageAmount = document.getElementById("averageAmount");
const totalLocations = document.getElementById("totalLocations");


// =========================================================
// LOCATION SUMMARY
// =========================================================

const locationStatistics = document.getElementById("locationStatistics");


// =========================================================
// FORGOT PASSWORD ELEMENTS
// =========================================================

const forgotPasswordBox = document.getElementById("forgotPasswordBox");
const recoveryEmail = document.getElementById("recoveryEmail");
const sendRecoveryButton = document.getElementById("sendRecoveryButton");
const recoveryMessage = document.getElementById("recoveryMessage");
const closeForgotPassword = document.getElementById("closeForgotPassword");


// =========================================================
// PASSWORD RESET ELEMENTS
// =========================================================

const passwordResetBox = document.getElementById("passwordResetBox");
const newAdminPassword = document.getElementById("newAdminPassword");
const confirmAdminPassword = document.getElementById("confirmAdminPassword");
const saveNewPassword = document.getElementById("saveNewPassword");
const resetMessage = document.getElementById("resetMessage");


// =========================================================
// INITIAL PAGE STATE
// =========================================================

if (adminApplication) {
    adminApplication.style.display = "none";
}

if (adminLoginBox) {
    adminLoginBox.style.display = "block";
}


// =========================================================
// PAGE LOAD
// =========================================================

document.addEventListener("DOMContentLoaded", async function () {
    setupEventListeners();
    await checkExistingSession();
});


// =========================================================
// EVENT LISTENERS
// =========================================================

function setupEventListeners() {
    adminLoginButton?.addEventListener("click", loginUser);
    logoutButton?.addEventListener("click", logoutUser);
    saveMemberButton?.addEventListener("click", saveMember);
    clearFormButton?.addEventListener("click", clearMemberForm);
    refreshButton?.addEventListener("click", loadMembers);
    searchInput?.addEventListener("input", renderMembers);
    exportButton?.addEventListener("click", exportCSV);

    forgotPasswordButton?.addEventListener(
        "click",
        openForgotPassword
    );

    closeForgotPassword?.addEventListener(
        "click",
        closeForgotPasswordBox
    );

    sendRecoveryButton?.addEventListener(
        "click",
        sendPasswordRecovery
    );

    saveNewPassword?.addEventListener(
        "click",
        updatePassword
    );

    // Login using ENTER.
    adminPassword?.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            loginUser();
        }
    });

    // Password recovery using ENTER.
    recoveryEmail?.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            sendPasswordRecovery();
        }
    });

    // One delegated handler for Edit and Delete.
    // This continues working after the table is re-rendered.
    membersTableBody?.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-action]");

        if (!button || !membersTableBody.contains(button)) {
            return;
        }

        const id = button.dataset.id;
        const action = button.dataset.action;

        if (!id) {
            return;
        }

        if (action === "edit") {
            editMember(id);
        } else if (action === "delete") {
            deleteMember(id);
        }
    });

    // Handle Supabase authentication changes.
    supabaseClient.auth.onAuthStateChange(function (event, session) {
        if (event === "PASSWORD_RECOVERY") {
            currentUser = session?.user || null;
            showPasswordReset();
            return;
        }

        if (event === "SIGNED_OUT") {
            currentUser = null;
            currentRole = "member";
            currentUsername = "";
            allMembers = [];
            showLoginScreen();
        }
    });
}


// =========================================================
// CHECK EXISTING SESSION
// =========================================================

async function checkExistingSession() {
    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) {
            console.error("Session error:", error);
            showLoginScreen();
            return;
        }

        if (data.session) {
            currentUser = data.session.user;
            await startApplication();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error("Session check failed:", error);
        showLoginScreen();
    }
}


// =========================================================
// LOGIN
// =========================================================

async function loginUser() {
    const emailValue = adminEmail?.value.trim() || "";
    const passwordValue = adminPassword?.value || "";

    if (!emailValue || !passwordValue) {
        showLoginMessage(
            "Please enter your email and password.",
            "error"
        );
        return;
    }

    showLoginMessage("Signing in...", "info");

    if (adminLoginButton) {
        adminLoginButton.disabled = true;
    }

    try {
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: emailValue,
                password: passwordValue
            });

        if (error) {
            showLoginMessage(error.message, "error");
            return;
        }

        currentUser = data.user;

        if (adminPassword) {
            adminPassword.value = "";
        }

        await startApplication();
    } catch (error) {
        console.error("Login error:", error);

        showLoginMessage(
            "Unable to sign in. Please try again.",
            "error"
        );
    } finally {
        if (adminLoginButton) {
            adminLoginButton.disabled = false;
        }
    }
}


// =========================================================
// START APPLICATION
// =========================================================

async function startApplication() {
    if (!currentUser) {
        showLoginScreen();
        return;
    }

    await loadUserRole(currentUser.id);
    showApplication();
    await loadMembers();
}


// =========================================================
// LOAD USER ROLE
// =========================================================

async function loadUserRole(userId) {
    currentRole = "member";
    currentUsername = currentUser?.email || "";

    try {
        const { data, error } = await supabaseClient
            .from("user_roles")
            .select("role, username")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) {
            console.warn("Role lookup:", error.message);
            applyPermissions();
            return;
        }

        if (data) {
            currentRole =
                String(data.role || "member").toLowerCase();

            if (data.username) {
                currentUsername = data.username;
            }
        }
    } catch (error) {
        console.error("Role error:", error);
    }

    applyPermissions();
}


// =========================================================
// PERMISSIONS
// =========================================================

function isAdmin() {
    return currentRole === "admin";
}

function applyPermissions() {
    const registrationSection =
        document.getElementById("memberRegistrationSection");

    if (isAdmin()) {
        if (registrationSection) {
            registrationSection.style.display = "block";
        }

        if (exportButton) {
            exportButton.style.display = "inline-block";
        }

        return;
    }

    if (registrationSection) {
        registrationSection.style.display = "none";
    }

    if (exportButton) {
        exportButton.style.display = "none";
    }
}


// =========================================================
// SHOW APPLICATION
// =========================================================

function showApplication() {
    if (adminLoginBox) {
        adminLoginBox.style.display = "none";
    }

    if (adminApplication) {
        adminApplication.style.display = "block";
    }

    if (loggedInUser) {
        loggedInUser.textContent =
            "Logged in as: " +
            currentUsername +
            " (" + currentRole + ")";
    }
}


// =========================================================
// SHOW LOGIN SCREEN
// =========================================================

function showLoginScreen() {
    if (adminApplication) {
        adminApplication.style.display = "none";
    }

    if (adminLoginBox) {
        adminLoginBox.style.display = "block";
    }

    if (adminEmail) adminEmail.value = "";
    if (adminPassword) adminPassword.value = "";

    showLoginMessage("", "");
}


// =========================================================
// LOGOUT
// =========================================================

async function logoutUser() {
    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Logout error:", error);
        }
    } catch (error) {
        console.error("Logout error:", error);
    }

    currentUser = null;
    currentRole = "member";
    currentUsername = "";
    allMembers = [];

    clearMemberForm();
    showLoginScreen();
}


// =========================================================
// LOAD MEMBERS
// =========================================================

async function loadMembers() {
    if (!currentUser) {
        return;
    }

    if (membersTableBody) {
        membersTableBody.innerHTML = `
            <tr>
                <td colspan="12" class="table-message">
                    Loading members...
                </td>
            </tr>
        `;
    }

    try {
        const { data, error } = await supabaseClient
            .from("idogwu_members")
            .select(`
                id,
                full_name,
                phone,
                location,
                gender,
                age,
                education,
                marital_status,
                amount,
                purpose,
                created_at
            `)
            .order("full_name", {
                ascending: true
            });

        if (error) {
            console.error("Load members error:", error);

            if (membersTableBody) {
                membersTableBody.innerHTML = `
                    <tr>
                        <td colspan="12" class="table-message">
                            Unable to load members.
                            ${escapeHTML(error.message)}
                        </td>
                    </tr>
                `;
            }

            return;
        }

        allMembers = data || [];

        updateDashboard();
        renderMembers();
        renderLocationStatistics();

    } catch (error) {
        console.error("Unexpected load error:", error);

        if (membersTableBody) {
            membersTableBody.innerHTML = `
                <tr>
                    <td colspan="12" class="table-message">
                        An unexpected error occurred while loading members.
                    </td>
                </tr>
            `;
        }
    }
}


// =========================================================
// UPDATE DASHBOARD
// =========================================================

function updateDashboard() {
    const total = allMembers.length;

    let paid = 0;
    let unpaid = 0;
    let contributionTotal = 0;

    const locations = new Set();

    allMembers.forEach(function (member) {
        const memberAmount = Number(member.amount || 0);

        contributionTotal += memberAmount;

        if (memberAmount > 0) {
            paid++;
        } else {
            unpaid++;
        }

        const location =
            String(member.location || "").trim();

        if (location) {
            locations.add(location.toLowerCase());
        }
    });

    const average =
        total > 0 ? contributionTotal / total : 0;

    if (totalMembers) totalMembers.textContent = total;
    if (paidMembers) paidMembers.textContent = paid;
    if (unpaidMembers) unpaidMembers.textContent = unpaid;

    if (totalAmount) {
        totalAmount.textContent =
            formatCurrency(contributionTotal);
    }

    if (averageAmount) {
        averageAmount.textContent = formatCurrency(average);
    }

    if (totalLocations) {
        totalLocations.textContent = locations.size;
    }
}


// =========================================================
// SEARCH
// Email and Occupation are excluded.
// =========================================================

function memberMatchesSearch(member, searchTerm) {
    const searchableValues = [
        member.full_name,
        member.phone,
        member.location,
        member.gender,
        member.age,
        member.education,
        member.marital_status,
        member.amount,
        member.purpose
    ];

    return searchableValues.some(function (value) {
        return String(value ?? "")
            .toLowerCase()
            .includes(searchTerm);
    });
}


// =========================================================
// RENDER MEMBERS TABLE
// Exactly 12 columns, matching index.html.
// =========================================================

function renderMembers() {
    if (!membersTableBody) {
        return;
    }

    const searchTerm =
        String(searchInput?.value || "")
            .trim()
            .toLowerCase();

    const filteredMembers = searchTerm
        ? allMembers.filter(function (member) {
            return memberMatchesSearch(member, searchTerm);
        })
        : allMembers;

    if (filteredMembers.length === 0) {
        membersTableBody.innerHTML = `
            <tr>
                <td colspan="12" class="table-message">
                    No members found.
                </td>
            </tr>
        `;
        return;
    }

    membersTableBody.innerHTML = "";

    filteredMembers.forEach(function (member, index) {
        const row = document.createElement("tr");
        const amountValue = Number(member.amount || 0);

        const actionHTML = isAdmin()
            ? `
                <div class="action-buttons">
                    <button
                        type="button"
                        class="btn btn-warning"
                        data-action="edit"
                        data-id="${escapeHTML(member.id)}">
                        Edit
                    </button>

                    <button
                        type="button"
                        class="btn btn-danger"
                        data-action="delete"
                        data-id="${escapeHTML(member.id)}">
                        Delete
                    </button>
                </div>
            `
            : `<span>View only</span>`;

       row.innerHTML = `
    <td>${index + 1}</td>
    <td>${escapeHTML(member.full_name)}</td>
    <td>${escapeHTML(member.phone)}</td>
    <td>${escapeHTML(member.location)}</td>
    <td>${escapeHTML(member.gender)}</td>
    <td>${escapeHTML(member.age ?? "")}</td>
    <td>${escapeHTML(member.education ?? "")}</td>
    <td>${escapeHTML(member.marital_status)}</td>
    <td>${formatCurrency(Number(member.amount || 0))}</td>
    <td>${escapeHTML(member.purpose ?? "")}</td>
    <td>${formatDate(member.created_at)}</td>
    <td>${actionHTML}</td>
`;
        membersTableBody.appendChild(row);
    });
}


// =========================================================
// FAMILY LOCATION SUMMARY
// =========================================================

function renderLocationStatistics() {
    if (!locationStatistics) {
        return;
    }

    locationStatistics.innerHTML = "";

    if (!allMembers.length) {
        locationStatistics.innerHTML = `
            <div class="table-message">
                No location statistics available.
            </div>
        `;
        return;
    }

    const locationCounts = {};

    allMembers.forEach(function (member) {
        let location =
            String(member.location || "").trim();

        if (!location) {
            location = "Location Not Provided";
        }

        const key = location.toLowerCase();

        if (!locationCounts[key]) {
            locationCounts[key] = {
                name: location,
                count: 0
            };
        }

        locationCounts[key].count++;
    });

    const locations = Object.values(locationCounts)
        .sort(function (a, b) {
            return b.count - a.count;
        });

    locations.forEach(function (location) {
        const card = document.createElement("div");
        card.className = "location-card";

        const name = document.createElement("div");
        name.className = "location-name";
        name.textContent = location.name;

        const count = document.createElement("div");
        count.className = "location-count";
        count.textContent =
            location.count +
            (location.count === 1 ? " Member" : " Members");

        card.appendChild(name);
        card.appendChild(count);
        locationStatistics.appendChild(card);
    });
}


// =========================================================
// SAVE MEMBER
// Age and education are optional.
// Email and Occupation are not used.
// =========================================================

async function saveMember() {
    if (!isAdmin()) {
        showMemberMessage(
            "You do not have permission to add or edit members.",
            "error"
        );
        return;
    }

    const nameValue = fullName?.value.trim() || "";
    const phoneValue = phone?.value.trim() || "";
    const locationValue = locationInput?.value.trim() || "";
    const genderValue = gender?.value || "";
    const ageText = age?.value.trim() || "";
    const educationValue = education?.value.trim() || "";
    const maritalStatusValue = maritalStatus?.value || "";
    const amountText = amount?.value.trim() || "";
    const amountValue = amountText === "" ? 0 : Number(amountText);
    const purposeValue = purpose?.value.trim() || "";

    if (
        !fullName ||
        !phone ||
        !locationInput ||
        !gender ||
        !maritalStatus
    ) {
        showMemberMessage(
            "Some required form elements are missing from index.html.",
            "error"
        );
        return;
    }

    if (!nameValue) {
        showMemberMessage(
            "Please enter the member's full name.",
            "error"
        );
        fullName.focus();
        return;
    }

    if (!phoneValue) {
        showMemberMessage(
            "Please enter the member's phone number.",
            "error"
        );
        phone.focus();
        return;
    }

    if (!locationValue) {
        showMemberMessage(
            "Please enter the member's location.",
            "error"
        );
        locationInput.focus();
        return;
    }

    if (!genderValue) {
        showMemberMessage(
            "Please select the member's gender.",
            "error"
        );
        gender.focus();
        return;
    }

    let ageValue = null;

    if (ageText !== "") {
        ageValue = Number(ageText);

        if (
            !Number.isInteger(ageValue) ||
            ageValue < 1 ||
            ageValue > 120
        ) {
            showMemberMessage(
                "Please enter an age between 1 and 120, or leave it blank.",
                "error"
            );
            age?.focus();
            return;
        }
    }

    if (!maritalStatusValue) {
        showMemberMessage(
            "Please select the marital status.",
            "error"
        );
        maritalStatus.focus();
        return;
    }

    if (!Number.isFinite(amountValue) || amountValue < 0) {
        showMemberMessage(
            "Please enter a valid contribution amount.",
            "error"
        );
        amount?.focus();
        return;
    }

    if (saveMemberButton) {
        saveMemberButton.disabled = true;
    }

    showMemberMessage(
        memberId?.value ? "Updating member..." : "Saving member...",
        "info"
    );

    try {
        const memberData = {
            full_name: nameValue,
            phone: phoneValue,
            location: locationValue,
            gender: genderValue,
            age: ageValue,
            education: educationValue || null,
            marital_status: maritalStatusValue,
            amount: amountValue,
            purpose: purposeValue || null
        };

        let result;
        const editing = Boolean(memberId?.value);

        if (editing) {
            result = await supabaseClient
                .from("idogwu_members")
                .update(memberData)
                .eq("id", memberId.value)
                .select("id");
        } else {
            result = await supabaseClient
                .from("idogwu_members")
                .insert(memberData)
                .select("id");
        }

        if (result.error) {
            console.error("Save member error:", result.error);

            showMemberMessage(
                "Unable to save member: " + result.error.message,
                "error"
            );
            return;
        }

        if (editing && (!result.data || result.data.length === 0)) {
            showMemberMessage(
                "No member was updated. Check your Supabase permissions.",
                "error"
            );
            return;
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
    console.error("Save member failed:", error);

    showMemberMessage(
        "Save failed: " + (error?.message || String(error)),
        "error"
    );

    } finally {
        if (saveMemberButton) {
            saveMemberButton.disabled = false;
        }
    }
}


// =========================================================
// EDIT MEMBER
// =========================================================

function editMember(id) {
    if (!isAdmin()) {
        alert("You do not have permission to edit members.");
        return;
    }

    const member = allMembers.find(function (item) {
        return String(item.id) === String(id);
    });

    if (!member) {
        alert(
            "Member not found in the current list. Please refresh and try again."
        );
        return;
    }

    // Populate every field in the registration form.
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
        "Editing " + (member.full_name || "member") +
        ". Make your changes, then click Update Member.",
        "info"
    );

    const formSection =
        document.getElementById("memberRegistrationSection");

    if (formSection) {
        formSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    fullName?.focus();
}


// =========================================================
// DELETE MEMBER
// =========================================================

async function deleteMember(id) {
    if (!isAdmin()) {
        alert("You do not have permission to delete members.");
        return;
    }

    const member = allMembers.find(function (item) {
        return String(item.id) === String(id);
    });

    if (!member) {
        alert("Member not found. Please refresh and try again.");
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to delete " +
        (member.full_name || "this member") +
        "?"
    );

    if (!confirmed) {
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from("idogwu_members")
            .delete()
            .eq("id", id)
            .select("id");

        if (error) {
            console.error("Delete error:", error);
            alert("Unable to delete member: " + error.message);
            return;
        }

        if (!data || data.length === 0) {
            alert(
                "No member was deleted. Check your Supabase permissions."
            );
            return;
        }

        if (String(memberId?.value) === String(id)) {
            clearMemberForm();
        }

        await loadMembers();
        alert("Member deleted successfully.");

    } catch (error) {
        console.error("Delete error:", error);
        alert("Unable to delete member. Please try again.");
    }
}


// =========================================================
// CLEAR MEMBER FORM
// =========================================================

function clearMemberForm() {
    if (memberId) memberId.value = "";
    if (fullName) fullName.value = "";
    if (phone) phone.value = "";
    if (locationInput) locationInput.value = "";
    if (gender) gender.value = "";
    if (age) age.value = "";
    if (education) education.value = "";
    if (maritalStatus) maritalStatus.value = "";
    if (amount) amount.value = "";
    if (purpose) purpose.value = "";

    if (saveMemberButton) {
        saveMemberButton.textContent = "Save Member";
        saveMemberButton.disabled = false;
    }

    if (memberMessage) {
        memberMessage.textContent = "";
        memberMessage.className = "message";
    }
}


// =========================================================
// EXPORT CSV
// No Email or Occupation columns.
// =========================================================

function exportCSV() {
    if (!isAdmin()) {
        alert("Only administrators can export member data.");
        return;
    }

    if (!allMembers.length) {
        alert("There are no members to export.");
        return;
    }

    const searchTerm =
        String(searchInput?.value || "")
            .trim()
            .toLowerCase();

    const membersToExport = searchTerm
        ? allMembers.filter(function (member) {
            return memberMatchesSearch(member, searchTerm);
        })
        : allMembers;

    if (!membersToExport.length) {
        alert("There are no matching members to export.");
        return;
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

    const rows = membersToExport.map(function (member, index) {
        return [
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
        ];
    });

    const csv = [headers, ...rows]
        .map(function (row) {
            return row.map(function (value) {
                return '"' +
                    String(value ?? "").replace(/"/g, '""') +
                    '"';
            }).join(",");
        })
        .join("\r\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "idogwu_family_members.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 1000);
}


// =========================================================
// FORGOT PASSWORD
// Administrator email remains in use here.
// =========================================================

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


// =========================================================
// SEND PASSWORD RECOVERY
// =========================================================

async function sendPasswordRecovery() {
    const emailValue = recoveryEmail?.value.trim() || "";

    if (!emailValue) {
        showRecoveryMessage(
            "Please enter your registered administrator email address.",
            "error"
        );
        return;
    }

    if (sendRecoveryButton) {
        sendRecoveryButton.disabled = true;
    }

    showRecoveryMessage(
        "Sending password recovery email...",
        "info"
    );

    try {
        const redirectUrl =
            window.location.origin + window.location.pathname;

        const { error } =
            await supabaseClient.auth.resetPasswordForEmail(
                emailValue,
                { redirectTo: redirectUrl }
            );

        if (error) {
            console.error("Recovery error:", error);
            showRecoveryMessage(error.message, "error");
            return;
        }

        showRecoveryMessage(
            "Password recovery email sent. Please check your email.",
            "success"
        );

    } catch (error) {
        console.error("Recovery error:", error);

        showRecoveryMessage(
            "Unable to send recovery email.",
            "error"
        );
    } finally {
        if (sendRecoveryButton) {
            sendRecoveryButton.disabled = false;
        }
    }
}


// =========================================================
// SHOW PASSWORD RESET
// =========================================================

function showPasswordReset() {
    if (passwordResetBox) {
        passwordResetBox.style.display = "flex";
    }

    if (newAdminPassword) newAdminPassword.value = "";
    if (confirmAdminPassword) confirmAdminPassword.value = "";

    showResetMessage("", "");
}


// =========================================================
// UPDATE PASSWORD
// =========================================================

async function updatePassword() {
    const newPassword = newAdminPassword?.value || "";
    const confirmPassword = confirmAdminPassword?.value || "";

    if (!newPassword) {
        showResetMessage("Please enter a new password.", "error");
        return;
    }

    if (newPassword.length < 6) {
        showResetMessage(
            "Password must be at least 6 characters.",
            "error"
        );
        return;
    }

    if (newPassword !== confirmPassword) {
        showResetMessage(
            "The passwords do not match.",
            "error"
        );
        return;
    }

    if (saveNewPassword) {
        saveNewPassword.disabled = true;
    }

    showResetMessage("Updating password...", "info");

    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) {
            console.error("Password update error:", error);
            showResetMessage(error.message, "error");
            return;
        }

        showResetMessage(
            "Password updated successfully.",
            "success"
        );

        if (newAdminPassword) newAdminPassword.value = "";
        if (confirmAdminPassword) confirmAdminPassword.value = "";

        window.setTimeout(function () {
            if (passwordResetBox) {
                passwordResetBox.style.display = "none";
            }
        }, 2000);

    } catch (error) {
        console.error("Password update error:", error);

        showResetMessage(
            "Unable to update password.",
            "error"
        );
    } finally {
        if (saveNewPassword) {
            saveNewPassword.disabled = false;
        }
    }
}


// =========================================================
// MESSAGE FUNCTIONS
// =========================================================

function setMessage(element, message, type) {
    if (!element) return;

    element.textContent = message;
    element.className = "message";

    if (type === "error") {
        element.style.color = "#c62828";
    } else if (type === "success") {
        element.style.color = "#126b35";
    } else {
        element.style.color = "#666";
    }
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


// =========================================================
// FORMAT CURRENCY
// =========================================================

function formatCurrency(value) {
    const number = Number(value || 0);

    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2
    }).format(number);
}


// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(date);
}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =========================================================
// MAKE FUNCTIONS AVAILABLE TO HTML
// =========================================================

window.editMember = editMember;
window.deleteMember = deleteMember;
