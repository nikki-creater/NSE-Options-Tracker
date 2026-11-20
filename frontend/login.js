const loginForm = document.getElementById("loginForm");

const username = document.getElementById("username");
const password = document.getElementById("password");
const message = document.getElementById("message");

const togglePassword = document.getElementById("togglePassword");

// Show / Hide Password
togglePassword.addEventListener("click", function () {
  if (password.type === "password") {
    password.type = "text";
    togglePassword.textContent = "Hide";
  } else {
    password.type = "password";
    togglePassword.textContent = "Show";
  }
});

// Demo login form
loginForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const user = username.value.trim();
  const pass = password.value.trim();

  if (!user || !pass) {
    message.style.color = "red";
    message.textContent = "Please enter username and password.";
    return;
  }

  message.style.color = "#1765a5";
  message.textContent =
    "Login form is ready. Connect backend authentication to continue.";
});

// Forgot password
document
  .getElementById("forgotPassword")
  .addEventListener("click", function (event) {
    event.preventDefault();

    alert("Please contact the administrator to reset your password.");
  });
