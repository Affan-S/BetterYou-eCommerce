const express = require("express");
const csrf = require("csurf");
const nodemailer = require("nodemailer");
const router = express.Router();
const {
  userContactUsValidationRules,
  validateContactUs,
} = require("../config/validator");
const csrfProtection = csrf();
router.use(csrfProtection);

//GET: display abous us page
router.get("/about-us", (req, res) => {
  res.render("pages/about-us", {
    pageName: "About Us",
  });
});

//GET: display why-choose-better-you page
router.get("/why-choose-better-you", (req, res) => {
  res.render("pages/why-choose-better-you", {
    pageName: "Why Choose Better You",
  });
});

//GET: display return policy page
router.get("/return-policy", (req, res) => {
  res.render("pages/return-policy", {
    pageName: "Return Policy",
  });
});


//GET: display shipping info page
router.get("/shippinginfo", (req, res) => {
  res.render("pages/shippinginfo", {
    pageName: "Shipping Information",
  });
});

//GET: display FAQ page
router.get("/faq", (req, res) => {
  res.render("pages/faq", {
    pageName: "Frequenty Asked Questions",
  });
});

//GET: display shipping policy page
router.get("/shipping-policy", (req, res) => {
  res.render("pages/shipping-policy", {
    pageName: "Shipping Policy",
  });
});

//GET: display shipping policy page
router.get("/payment-information", (req, res) => {
  res.render("pages/payment-information", {
    pageName: "Payment Information",
  });
});


//GET: display term and conditions
router.get("/tandc", (req, res) => {
  res.render("pages/tandc", {
    pageName: "Terms and Conditions",
  });
});


//GET: display price beating page
router.get("/price-beating", (req, res) => {
  res.render("pages/price-beating", {
    pageName: "Price Beatings",
  });
});



//GET: display warranty page
router.get("/warranty", (req, res) => {
  res.render("pages/warranty", {
    pageName: "Warranty",
  });
});

//GET: display contact us page and form with csrf tokens
router.get("/contact-us", (req, res) => {
  const successMsg = req.flash("success")[0];
  const errorMsg = req.flash("error");
  res.render("pages/contact-us", {
    pageName: "Contact Us",
    csrfToken: req.csrfToken(),
    successMsg,
    errorMsg,
  });
});

//POST: handle contact us form logic using nodemailer
router.post(
  "/contact-us",
  [userContactUsValidationRules(), validateContactUs],
  (req, res) => {
    // instantiate the SMTP server
    const smtpTrans = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        // company's email and password
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // email options
    const mailOpts = {
      from: req.body.email,
      to: process.env.GMAIL_EMAIL,
      subject: `Enquiry from ${req.body.name}`,
      html: `
      <div>
      <h2 style="color: #478ba2; text-align:center;">Client's name: ${req.body.name}</h2>
      <h3 style="color: #478ba2;">Client's email: (${req.body.email})<h3>
      </div>
      <h3 style="color: #478ba2;">Client's message: </h3>
      <div style="font-size: 30;">
      ${req.body.message}
      </div>
      `,
    };

    // send the email
    smtpTrans.sendMail(mailOpts, (error, response) => {
      if (error) {
        req.flash(
          "error",
          "An error occured... Please check your internet connection and try again later"
        );
        return res.redirect("/pages/contact-us");
      } else {
        req.flash(
          "success",
          "Email sent successfully! Thanks for your inquiry."
        );
        return res.redirect("/pages/contact-us");
      }
    });
  }
);

module.exports = router;
