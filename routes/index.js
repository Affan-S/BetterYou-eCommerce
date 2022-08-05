const express = require("express");
const csrf = require("csurf");
const stripe = require("stripe")('sk_test_51JP8ekCn0yi3AWTGROSzJKx12sqS56LoF0FPUg8765Yvq1zHDQCY0UcFJMPEIC7gBon0WxRa3y4lDAHpsNviKEky00gWcQulWD');
const Product = require("../models/product");
const Category = require("../models/category");
const Cart = require("../models/cart");
const Order = require("../models/order");
const middleware = require("../middleware");
const { create } = require("../models/product");
const router = express.Router();

const order = require("../models/order");
const moment = require("moment");
const { date } = require("faker");

const csrfProtection = csrf();
router.use(csrfProtection);

// GET: home page
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({})
      .sort("-createdAt")
      .populate("category");
    res.render("shop/home", { pageName: "Home", products });
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

// GET: add a product to the shopping cart when "Add to cart" button is pressed
router.get("/add-to-cart/:id", async (req, res) => {
  const productId = req.params.id;
  try {
    // get the correct cart, either from the db, session, or an empty cart.
    let user_cart;
    if (req.user) {
      user_cart = await Cart.findOne({ user: req.user._id });
    }
    let cart;
    if ((req.user && !user_cart && req.session.cart) || (!req.user && req.session.cart)) {
      cart = await Cart.findById(req.session.cart._id);
    } else if (!req.user || !user_cart) {
      cart = await new Cart(req.session.cart);
    } else {
      cart = user_cart;
    }

    if (req.user) {
      cart.user = req.user._id;
    }

    // add the product to the cart
    const product = await Product.findById(productId);
    const itemIndex = cart.items.findIndex((p) => p.productId == productId);
    if (itemIndex > -1) {
      // if product exists in the cart, update the quantity
      cart.items[itemIndex].qty++;
      cart.items[itemIndex].price = cart.items[itemIndex].qty * product.price;
      cart.totalQty++;
      cart.totalCost += product.price;
      await cart.save();
      req.session.cart = cart;
      req.flash("success", "Item added to the shopping cart");

      if (req.query.addMethod === "buyNow") {
        res.redirect("/shopping-cart");
      } else if (req.query.addMethod === "addToCart") {
        res.redirect(req.headers.referer);
      }else{
        res.redirect(req.headers.referer);
      }
    } else {
      // if product does not exists in cart, find it in the db to retrieve its price and add new item
      cart.items.push({
        productId: productId,
        qty: 1,
        price: product.price,
        title: product.title,
        productCode: product.productCode,
      });
      cart.totalQty++;
      cart.totalCost += product.price;
      await cart.save();
      req.session.cart = cart;
      req.flash("success", "Item added to the shopping cart");

      if (req.query.addMethod === "buyNow") {
        res.redirect("/shopping-cart");
      }else if(req.query.addMethod === "addToCart"){
        res.redirect(req.headers.referer);
      }else{
        res.redirect(req.headers.referer);
      }
    }
  } catch (err) {
    console.log(err.message);
    res.redirect("/");
  }
});

// GET: view shopping cart contents
router.get("/shopping-cart", async (req, res) => {
  try {
    // find the cart, whether in session or in db based on the user state
    let cart_user;
    if (req.user) {
      cart_user = await Cart.findOne({ user: req.user._id });
    }
    // if user is signed in and has cart, load user's cart from the db
    if (req.user && cart_user) {
      req.session.cart = cart_user;
      return res.render("shop/shopping-cart", {
        cart: cart_user,
        pageName: "Shopping Cart",
        products: await productsFromCart(cart_user),
      });
    }
    // if there is no cart in session and user is not logged in, cart is empty
    if (!req.session.cart) {
      return res.render("shop/shopping-cart", {
        cart: null,
        pageName: "Shopping Cart",
        products: null,
      });
    }

    // otherwise, load the session's cart
    return res.render("shop/shopping-cart", {
      cart: req.session.cart,
      pageName: "Shopping Cart",
      products: await productsFromCart(req.session.cart),
    });
  } catch (err) {
    console.log(err.message);
    res.redirect("/");
  }
});

// GET: reduce one from an item in the shopping cart
router.get("/reduce/:id", async function (req, res, next) {
  // if a user is logged in, reduce from the user's cart and save
  // else reduce from the session's cart
  const productId = req.params.id;
  let cart;
  try {

    if (req.user) {
      cart = await Cart.findOne({ user: req.user._id });
      await Cart.findOneAndDelete({ user: req.user._id});
    } else if (req.session.cart) {
      cart = await new Cart(req.session.cart);
      await Cart.findOneAndDelete({ _id : req.session.cart._id });
    }
    console.log(cart);
    // find the item with productId
    let itemIndex = cart.items.findIndex((p) => p.productId == productId);
    if (itemIndex > -1) {
      // find the product to find its price
      const product = await Product.findById(productId);
      // if product is found, reduce its qty
      cart.items[itemIndex].qty--;
      cart.items[itemIndex].price -= product.price;
      cart.totalQty--;
      cart.totalCost -= product.price;
      // if the item's qty reaches 0, remove it from the cart
      if (cart.items[itemIndex].qty <= 0) {
        await cart.items.remove({ _id: cart.items[itemIndex]._id });
      }
      req.session.cart = cart;
      //save the cart it only if user is logged in
      // if (req.user) {
      // }
      console.log(cart);
      await cart.save();
      //delete cart if qty is 0
      if (cart.totalQty <= 0) {
        req.session.cart = null;
        await Cart.findByIdAndRemove(cart._id);
      }
    }
    res.redirect(req.headers.referer);
  } catch (err) {
    console.log(err.message);
    res.redirect("/");
  }
});

// GET: remove all instances of a single product from the cart
router.get("/removeAll/:id", async function (req, res, next) {
  const productId = req.params.id;
  let cart;
  try {
    if (req.user) {
      cart = await Cart.findOne({ user: req.user._id });
    } else if (req.session.cart) {
      cart = await new Cart(req.session.cart);
    } else {
      cart = await Cart.findById({ _id: req.session.cart._id });
    }
    //fnd the item with productId
    let itemIndex = cart.items.findIndex((p) => p.productId == productId);
    if (itemIndex > -1) {
      //find the product to find its price
      cart.totalQty -= cart.items[itemIndex].qty;
      cart.totalCost -= cart.items[itemIndex].price;
      await cart.items.remove({ _id: cart.items[itemIndex]._id });
    }
    req.session.cart = cart;
    // await cart.save();
    //delete cart if qty is 0
    if (cart.totalQty <= 0) {
      req.session.cart = null;
      await Cart.findByIdAndRemove(cart._id);
    }
    res.redirect(req.headers.referer);
  } catch (err) {
    console.log(err.message);
    res.redirect("/");
  }
});

// GET: checkout form with csrf token
router.get("/checkout", async (req, res) => {
  const errorMsg = req.flash("error")[0];

  if (!req.session.cart) {
    return res.redirect("/shopping-cart");
  }
  let cart;
  //load the cart with the session's cart's id from the db
  cart = await Cart.findById(req.session.cart._id);
  const errMsg = req.flash("error")[0];
  res.render("shop/checkout", {
    total: cart.totalCost || req.body.totalCost,
    csrfToken: req.csrfToken(),
    errorMsg,
    pageName: "Checkout",
  });
});

// POST: handle checkout logic and payment using Stripe
router.post("/checkout", async (req, res) => {

  if (!req.session.cart) {
    return res.redirect("/shopping-cart");
  }
  let cart;
  cart = await Cart.findById(req.session.cart._id);
  const payMethod = req.body.payMethod;
  if (payMethod === "COD") {
    const order = new Order({
      user: req.user,
      recieverName: req.body.recieverName,
      cart: {
        totalQty: cart.totalQty,
        totalCost: cart.totalCost,
        items: cart.items,
      },
      address: req.body.address,
      contact: req.body.telnum,
      paymentMethod: req.body.payMethod,
    });
    order.save(async (err, newOrder) => {
      if (err) {
        console.log(err);
        return res.redirect("/checkout");
      }
      await cart.save();
      await Cart.findByIdAndDelete(cart._id);
      req.session.cart = null;
      res.render("shop/orderConfirmed", {
        items: cart.items,
        total: cart.totalCost,
        quantity: cart.totalQty,
        orderNumber: order.id,
        orderDate: order.createdAt,
        yourAddress: req.body.address,
        recieverName: req.body.recieverName,
        moment: moment,
        pageName: "Order Confirmation"
      });
    });
  } else {
    stripe.charges.create(
      {
        amount: cart.totalCost * 100,
        currency: "pkr",
        source: 'tok_visa',// req.body.stripeToken//,
        description: "Test charge payment - api docs",
      }, function (err, charge) {
        if (err) {
          req.flash("error", err.message);
          console.log(err);
          return res.redirect("/checkout");
        }
        const order = new Order({
          user: req.user,
          recieverName: req.body.recieverName,
          cart: {
            totalQty: cart.totalQty,
            totalCost: cart.totalCost,
            items: cart.items,
          },
          address: req.body.address,
          contact: req.body.telnum,
          paymentMethod: req.body.payMethod,
          paymentId: charge.id
        });
        order.save(async (err, newOrder) => {
          if (err) {
            console.log(err);
            return res.redirect("/checkout");
          }
          await cart.save();
          await Cart.findByIdAndDelete(cart._id);
          req.session.cart = null;
          res.render("shop/orderConfirmed", {
            items: cart.items,
            total: cart.totalCost,
            quantity: cart.totalQty,
            orderNumber: order.id,
            orderDate: order.createdAt,
            yourAddress: req.body.address,
            recieverName: req.body.recieverName,
            moment: moment,
            pageName: "Order Confirmation"
          });
        });
      }
    );
  }
});


router.get("/orderConfirmed", async (req, res) => {
  res.render("shop/orderConfirmed", {
    pageName: "Order Confirmed",
  });
}); 


// create products array to store the info of each product in the cart
async function productsFromCart(cart) {
  let products = []; // array of objects
  for (const item of cart.items) {
    let foundProduct = (
      await Product.findById(item.productId).populate("category")
    ).toObject();
    foundProduct["qty"] = item.qty;
    foundProduct["totalPrice"] = item.price;
    products.push(foundProduct);
  }
  return products;
}

module.exports = router;
