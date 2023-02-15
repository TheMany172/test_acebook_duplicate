const User = require("../models/user");

const UsersController = {
  New: (req, res) => {
    res.render("users/new", {error: req.session.error, session_user: req.session.user});
  },

  Create: (req, res) => {
    const user = new User(req.body);

    User.findOne({email : user.email}, (err, founduser) => {
      if (err) {
        console.log("found user err", err);
        throw err;
      }

      if (user.email === "" || user.password.length < 8 || founduser != null) {
        req.session.error = "INVALID USERNAME OR PASSWORD";
        console.log("invalid username or password", user.email, user.password, founduser);
        res.redirect("/users/new");
      } else if (founduser === null) {
        user.save((err) => {
          console.log("successful signup", err);
          if (err) {
            throw err;
          }
          console.log("redirect to log in")
          res.status(201).redirect("/sessions/new");
        });
      }
    })
  },
  
  Details: (req, res) => {
    if (!req.session.user && !req.cookies.user_sid) {
      res.redirect("/sessions/new");
    } else {
      const userId = req.params.id;
    const sessionId = req.session.user._id;

    User.findById(userId, (err, user) => {
      if (err) {
        throw err;
      }
  
      const isSessionUser = userId !== sessionId;
      
      if(userId != sessionId) {
        user.friends = [];
      }

      if (user.friends) {
        user.friends = user.friends.filter(friend => friend.status === "pending");
      }

      res.render("users/details", {
        user: user,
        session_user: req.session.user,
        is_session_user: isSessionUser,
      });
    });
    }
  },

  Request: (req, res) => {
    const currentId = req.session.user._id;
    const targetId = req.params.id;

    User.findById(currentId, (err) => {
      if(err){
        throw err;
      }
    }).then((current_user) => {
      User.findById(targetId, (err, user) => {
        if (err) {
          throw err;
        }
        let regex = /^\w*[^@]/g;
        let username = current_user.email.match(regex);
        
        if (current_user.friends.filter(object => object.user_id === targetId).length === 0 && targetId != currentId)
        {
          if (user.friends.filter(object => object.user_id === currentId).length === 0) {
            user.friends.push({user_id: `${currentId}`, status: "pending", username: username,})
    
            user.save((err) => {
              if (err) {
                throw err;
              }
            });
          }
        }
        res.status(201).redirect(`/users/${targetId}`);
      });
    })
  },

  Confirm: (req, res) => {
    const theirId = req.params.id;
    const hostId = req.session.user._id;

    User.findOneAndUpdate({"_id": hostId, "friends.user_id": theirId}, {"$set": {"friends.$.status": "confirmed"}}, (err) => {
      if (err) {
        throw err;
      }
    }).then(
      User.findById(theirId, (err, user) => {
      if (err) {
        throw err;
      }
      if (user.friends.filter(object => object.user_id === hostId).length === 0) {
        user.friends.push({user_id: `${hostId}`, status: "confirmed"})

        user.save((err) => {
          if (err) {
            throw err;
          }
          res.status(201).redirect(`/users/${hostId}`);
        });
      } else {
        res.status(201).redirect(`/users/${hostId}`);
      }
      })
    );

    
  },

  Deny: (req, res) => {
    const theirId = req.params.id;
    const hostId = req.session.user._id;

    User.findById(hostId, (err, user) => {
      if (err) {
        throw err;
      }
      
      let j = 0;
      for(let i = 0; i < user.friends.length; i++) {
        if (user.friends.some(user => user.user_id === theirId)) {
          j++;
        }
      }
      if (j > 0) {
        let index = user.friends.indexOf(theirId)
        user.friends.splice(index, 1)
      }

      user.save((err) => {
        if (err) {
          throw err;
        }
      });

      res.status(201).redirect(`/users/${hostId}`);
    })
},

  Picture: (req, res) => {
    const hostId = req.params.id;
    const currentId = req.session.user._id;
    
    User.findById(hostId, (err, user) => {
      const pic = req.body.picture
      const regex = /(https:\/\/.*\.(?:png|jpg|tif|tiff|bmp|jpeg|gif|JPG))/g
      if (regex.test(pic)) {
        user.picture = pic;
      }
      if (currentId === hostId) {
        user.save((err) => {
          if (err) {
            throw err;
          }
          req.session.user = user;
          res.status(201).redirect(`/users/${hostId}`);
        });
      } else {
        res.status(201).redirect(`/users/${hostId}`);
      }
    });
  },
};

module.exports = UsersController;
