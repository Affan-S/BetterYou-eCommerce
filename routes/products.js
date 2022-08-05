const express = require("express");
const router = express.Router();
const Product = require("../models/product");
const Category = require("../models/category");
var moment = require("moment");
const middleware = require("../middleware");
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
var comment;
var rating;

// GET: display all products
router.get("/", async (req, res) => {
  const successMsg = req.flash("success")[0];
  const errorMsg = req.flash("error")[0];
  const perPage = 8;
  let page = parseInt(req.query.page) || 1;
  try {
    const products = await Product.find({})
      .sort("-createdAt")
      .skip(perPage * page - perPage)
      .limit(perPage)
      .populate("category");

    const count = await Product.countDocuments();

    res.render("shop/index", {
      pageName: "All Products",
      products,
      successMsg,
      errorMsg,
      current: page,
      breadcrumbs: null,
      home: "/products/?",
      pages: Math.ceil(count / perPage),
    });
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

// GET: search box
router.get("/search", async (req, res) => {
  const perPage = 8;
  let page = parseInt(req.query.page) || 1;
  const successMsg = req.flash("success")[0];
  const errorMsg = req.flash("error")[0];

  try {
    const products = await Product.find({
      title: { $regex: req.query.search, $options: "i" },
    })
      .sort("-createdAt")
      .skip(perPage * page - perPage)
      .limit(perPage)
      .populate("category")
      .exec();
    const count = await Product.countDocuments({
      title: { $regex: req.query.search, $options: "i" },
    });
    res.render("shop/index", {
      pageName: "Search Results",
      products,
      successMsg,
      errorMsg,
      current: page,
      breadcrumbs: null,
      home: "/products/search?search=" + req.query.search + "&",
      pages: Math.ceil(count / perPage),
    });
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

//GET: get a certain category by its slug (this is used for the categories navbar)
router.get("/:slug", async (req, res) => {
  const successMsg = req.flash("success")[0];
  const errorMsg = req.flash("error")[0];
  const perPage = 8;
  let page = parseInt(req.query.page) || 1;
  try {

    const foundCategory = await Category.findOne({ slug: req.params.slug });
    const allProducts = await Product.find({ category: {_id: foundCategory.id} })
      .sort("-createdAt")
      .skip(perPage * page - perPage)
      .limit(perPage)
      .populate("category");

    const count = await Product.countDocuments({ category: foundCategory.id });

    res.render("shop/index", {
      pageName: foundCategory.title,
      currentCategory: foundCategory,
      products: allProducts,
      successMsg,
      errorMsg,
      current: page,
      breadcrumbs: req.breadcrumbs,
      home: "/products/" + req.params.slug.toString() + "/?",
      pages: Math.ceil(count / perPage),
    });
  } catch (error) {
    console.log(error);
    return res.redirect("/");
  }
});

// GET: display a certain product by its id
router.get("/:slug/:id", async (req, res) => {
  
  const successMsg = req.flash("success")[0];
  const errorMsg = req.flash("error")[0];
  try {
    const product = await Product.findById(req.params.id).populate("category");

    res.render("shop/product", {
      pageName: product.title,
      product,
      successMsg,
      errorMsg,
      moment: moment,
      comment: comment,
      rating: rating
    });
  } catch (error) {
    console.log(error);
    return res.redirect("/");
  }
});

// get: add a review to a product by its ID
router.get("/review/:slug/:id", middleware.isLoggedIn, async (req, res) => {
  try {

    const product = await Product.findById(req.params.id).populate("category");    

    // const comment = req.query.comment;
    const rating = req.body.rating;

    console.log("Comment : " + comment);
    console.log("Rating : " + rating);    


    const review = {
      name: req.user.username,
      comment: req.body.comment,
      rating: req.body.rating
    };

    product.reviews.push(review);
    product.save();
    res.redirect(req.headers.referer);

  } catch (error) {
    console.log(error);
    res.redirect(req.headers.referer);
    // res.redirect("/");
  }
});

module.exports = router;
