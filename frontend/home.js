/* =========================================================
   STEEL PLANT CMS
   HOME PAGE JAVASCRIPT
========================================================= */

/* =========================================================
   GO TO LOGIN PAGE
========================================================= */

function goToLogin() {
  /*
       Home Page
          ↓
       Login Page
    */

  window.location.href = "index.html";
}

/* =========================================================
   MOBILE MENU
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");

  const navMenu = document.getElementById("navMenu");

  if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener("click", function () {
      navMenu.classList.toggle("open");

      if (navMenu.classList.contains("open")) {
        mobileMenuBtn.textContent = "✕";
      } else {
        mobileMenuBtn.textContent = "☰";
      }
    });
  }

  /* =====================================================
       CLOSE MOBILE MENU AFTER CLICK
    ====================================================== */

  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      if (navMenu) {
        navMenu.classList.remove("open");
      }

      if (mobileMenuBtn) {
        mobileMenuBtn.textContent = "☰";
      }
    });
  });

  /* =====================================================
       ACTIVE NAVIGATION
    ====================================================== */

  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      navLinks.forEach(function (item) {
        item.classList.remove("active");
      });

      this.classList.add("active");
    });
  });

  /* =====================================================
       FOOTER YEAR
    ====================================================== */

  const footerYear = document.getElementById("footerYear");

  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }

  /* =====================================================
       COUNTER ANIMATION
    ====================================================== */

  const counters = document.querySelectorAll(".counter");

  let counterStarted = false;

  function startCounters() {
    if (counterStarted) {
      return;
    }

    counterStarted = true;

    counters.forEach(function (counter) {
      const target = Number(counter.getAttribute("data-target"));

      let current = 0;

      const increment = target / 70;

      function updateCounter() {
        current += increment;

        if (current < target) {
          counter.textContent = Math.ceil(current);

          requestAnimationFrame(updateCounter);
        } else {
          counter.textContent = target.toLocaleString();
        }
      }

      updateCounter();
    });
  }

  /* =====================================================
       COUNTER OBSERVER
    ====================================================== */

  const statsSection = document.querySelector(".stats-section");

  if (statsSection) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            startCounters();
          }
        });
      },
      {
        threshold: 0.3,
      },
    );

    observer.observe(statsSection);
  }

  /* =====================================================
       BACK TO TOP
    ====================================================== */

  const backToTop = document.getElementById("backToTop");

  window.addEventListener("scroll", function () {
    if (!backToTop) {
      return;
    }

    if (window.scrollY > 400) {
      backToTop.classList.add("show");
    } else {
      backToTop.classList.remove("show");
    }
  });

  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }

  /* =====================================================
       SCROLL ACTIVE NAVIGATION
    ====================================================== */

  const sections = document.querySelectorAll("section[id]");

  window.addEventListener("scroll", function () {
    let currentSection = "";

    sections.forEach(function (section) {
      const sectionTop = section.offsetTop - 120;

      const sectionHeight = section.offsetHeight;

      if (
        window.scrollY >= sectionTop &&
        window.scrollY < sectionTop + sectionHeight
      ) {
        currentSection = section.getAttribute("id");
      }
    });

    navLinks.forEach(function (link) {
      link.classList.remove("active");

      const href = link.getAttribute("href");

      if (href === "#" + currentSection) {
        link.classList.add("active");
      }
    });
  });

  /* =====================================================
       PREVENT HASH JUMP / SMOOTH SCROLL
    ====================================================== */

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (event) {
      const targetId = this.getAttribute("href");

      if (targetId === "#" || targetId === "#home") {
        event.preventDefault();

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        return;
      }

      const target = document.querySelector(targetId);

      if (target) {
        event.preventDefault();

        const offset = 70;

        const targetPosition =
          target.getBoundingClientRect().top + window.scrollY - offset;

        window.scrollTo({
          top: targetPosition,

          behavior: "smooth",
        });
      }
    });
  });

  /* =====================================================
       SIMPLE FADE-IN ANIMATION
    ====================================================== */

  const animatedElements = document.querySelectorAll(
    ".feature-card, .module-card, .contact-card, .workflow-item",
  );

  const animationObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    {
      threshold: 0.1,
    },
  );

  animatedElements.forEach(function (element) {
    animationObserver.observe(element);
  });
});
