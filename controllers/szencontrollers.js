const e = require('express');
const bcrypt = require('bcrypt');
const axios = require('axios');

//Load the home screen of the web app
exports.getHome = (req, res) => {

    var userinfo = {}; //userinfo is an array that will be used to store the user's name and user_id
    var username; //username is a string that will be used to store the user's name
    const {isloggedin, user_id, name} = req.session; //isloggedin is a boolean that will be used to check if the user is logged in, user_id is an integer that will be used to store the user's id, name is a string that will be used to store the user's name
    console.log(`User data is ${isloggedin} and ${user_id}`); 
    const session=req.session; //session is an object that will be used to store the user's session data

    //if the user is logged in, the user's name will be stored in the username variable
    res.render('index', {loggedin: isloggedin, userinfo: session.name});
        
};

//Load the mood logger screen of the web app
exports.getLogger = (req, res) => {
    var userinfo = {}; //userinfo is an array that will be used to store the user's name and user_id
    const {isloggedin, userid} = req.session;
    const session=req.session; //session is an object that will be used to store the user's session data
    console.log(session);
    console.log(session.isloggedin);
    console.log(session.user_id);

    const endpoint = 'http://localhost:3001/logger';
    
    axios
    .get(endpoint, req.body, {
      validateStatus: function (status) {
        return status < 500;
      }
      })
      .then((response) => {
        const status = response.status;
        console.log(response.data);
        if (status == 200) {
          console.log('data retreived');
          const selecttriggers = response.data.selecttriggers;
          const userInfo = {name: req.session.name};
          res.render('log', {selecttriggers, loggedin: isloggedin, userinfo: session.name});
        }
      })
      .catch ((error) => {
        console.error(error);
      });
    };

//Post the mood log to the database
exports.postNewMoodLog = (req, res) => {
  const isLoggedin = req.session.isloggedin; //isLoggedin is a boolean that will be used to check if the user is logged in
  const user_id = req.session.user_id; //user_id is an integer that will be used to store the user's id
  const { enjoyment, sadness, anger, contempt, disgust, fear, surprise, trigger, usernotes } = req.body; //get details from the request body to store in variables
  const vals = [user_id, sadness, anger, contempt, disgust, fear, surprise, trigger, usernotes]; //vals is an array that will be used to store the user's id, emotion name, emotion intensity and user notes
  var emotion_id = 0; //emotion_id is an integer that will be used to store the emotion's id
  var emotrigger_id = []; //emotrigger_id is an array that will be used to store the triggers' ids - this is necessary because a user can select multiple triggers
  console.log(req.body);

  const endpoint = `http://localhost:3001/log/${user_id}`;

  axios
  .post(endpoint, req.body, {
    validateStatus: function (status) {
      return status < 500;
    }
    })
    .then((response) => {
      const status = response.status;
      console.log(response.data);
      if (status == 200) {
        console.log('log inserted');
        res.redirect('/history');
      }
    })
    .catch ((error) => {
      console.error(error);
    });
};

//UPDATED FOR API - load the mood history screen of the web app
exports.getMoodHistory = (req, res) => {
        var userinfo = {}; //userinfo is an array that will be used to store the user's name and user_id
        const {isloggedin, user_id} = req.session;
        const name = req.session.name;
        const session=req.session; //session is an object that will be used to store the user's session data
        //load the user's mood history from the database
        const endpoint = `http://localhost:3001/history/${user_id}`;
        axios
        .get(endpoint, {
          validateStatus: function (status) {
            return status < 500;

          }
        })
        .then((response) => {
          const status = response.status;
          console.log("Status is" + status);
          console.log(response.data);
          if (status == 200) {
            console.log('data retreived');
            const history = response.data.data;
            console.log(history);
            res.render('history', { history : history, loggedin: isloggedin, userinfo: session.name });
          }  else {
            console.log('no data');
            res.render('history', { history : [], loggedin: isloggedin, userinfo: session.name });
          }
        })
        .catch ((error) => {
          console.error(error);
        });
      };

//NO UPDATE NEEDED - load the log in screen of the web app
exports.getLoginScreen = (req, res) => {
    var userinfo = {};
    const {isloggedin, userid, loginSuccessful} = req.session;
    res.render('login', {loggedin: isloggedin, loginSuccessful: true});
};

//NO UPDATE NEEDED - load the registration screen of the web app
exports.getRegistrationScreen = (req, res) => {
    var userinfo = {};
    res.render('register', {loggedin: false, emailExists: false});
};

//UPDATED FOR API - post the registration details to the database
exports.postregistration = async (req, res) => {
    const {firstname, lastname, useremail, password_new} = req.body;
    const hashedPassword = await bcrypt.hash(password_new, 13);
    const vals = [firstname, lastname, useremail, hashedPassword];
    console.log(vals);
    var registration_successful;

    const endpoint = 'http://localhost:3001/register';

    axios
    .post(endpoint, req.body, {
      validateStatus: function (status) {
        return status < 500;
      }
    })
    .then((response) => {
      const status = response.status;
      console.log(response.data);
      if (status == 201) {
        console.log('user registered');
        res.redirect('/login');
      } else if (status == 409) {
        console.log('Email already registered');
        res.render('register', {loggedin: false, registrationSuccessful: false, emailExists: true});
      } else {
        console.log('user not registered');
        res.render('register', {loggedin: false, registrationSuccessful: false, emailExists: false});
      }
    })
    .catch((error) => {
      console.error(error);
    });
    /*
    //check if email is already registered
    const checkEmailSQL = 'SELECT email FROM user WHERE email = ?';
    conn.query(checkEmailSQL, useremail, (err, rows) => {
        if (err) throw err;
        console.log(rows);
        if (rows.length > 0) {
            console.log('Email already registered');
            res.render('register', {loggedin: false, registrationSuccessful: false, emailExists: true});
        } else {
          const insertSQL = 'INSERT INTO user (user_id, first_name, last_name, email, password) VALUES (NULL, ?, ?, ?, ?)';
          conn.query(insertSQL, vals, (err, rows) => {
            if (err) {
              throw err;
            } else {
            console.log(rows);
            res.redirect('/login');
            }
          })
            
        }
    });
    */
};

//UPDATED FOR API - post the login details to the database
exports.postLogin = (req,res) => {

  const {useremail, password} = req.body;

  const endpoint= 'http://localhost:3001/login';

  axios
  .post(endpoint, req.body, {
    validateStatus: function (status) {
      return status < 500;
    }
  })
  .then((response) => {
    const status = response.status;
    console.log(response.data);
    if (status == 200) {
      console.log('user found');
      console.log(response.data);
      const session = req.session;
      session.isloggedin = true;
      session.user_id = response.data.user_id;
      session.name = response.data.name;
      session.loginSuccessful = 'pass';
      console.log(session);
      res.redirect(req.session.route || '/');
    } else {
      const data = response.data;
      console.log(data);
      res.render('login', { loggedin: false, loginSuccessful: false,});
    }
    
    })
  .catch((error) => {
    console.error(error);
  });
};

//NO UPDATED NEEDED log the user out of the web app
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};

//UPDATED FOR API - load the edit log screen of the web app
exports.selectLog = (req, res) => {
  const {isloggedin, user_id} = req.session;
  let verified_id;
  const session=req.session; //session is an object that will be used to store the user's session data
  var emotion_log_id = {
    "emotion_log_id": req.params.id
  };
  
  const endpoint = `http://localhost:3001/select/${user_id}`;

  axios
  .get(endpoint, {
    params: {
      param1: user_id,
      param2: emotion_log_id
    },
    validateStatus: function (status) {
      return status < 500;
    }
  })
  .then((response) => {
    const status = response.status;
    console.log(response.data);
    if (status == 200) {
      console.log('data retreived');
      console.log(response.data);
      console.log(response.data.data[0]);
      res.render('editlog', { details: response.data.data, triggers: response.data.triggers, selecttriggers: response.data.selecttriggers, loggedin: isloggedin, userinfo: session.name });
    } else if (status == 403) {
      res.redirect('/');
    } else {
      res.redirect('/');
    }
  })
  .catch((error) => {
    console.error(error);
  });
};

//UPDATED FOR API - edit the mood log in the database
exports.editMoodLog = async (req, res) => {
  try {
    const { enjoyment, sadness, anger, contempt, disgust, fear, surprise, trigger, usernotes } = req.body; //get details from the request body to store in variables
    let triggers = Array.isArray(trigger) ? trigger : [trigger];
    triggers = triggers.map(trigger => trigger.replace(/\r\n/g, ''));
    // Remove empty elements from the 'triggerArray'
    triggers = triggers.filter(trigger => trigger.trim() !== '');
    const trigger_id = [];

    const endpoint = `http://localhost:3001/edit/${req.params.id}`;

    axios
    .put(endpoint, req.body, {
      validateStatus: function (status) {
        return status < 500;
      }
    })
    .then((response) => {
      const status = response.status;
      console.log(response.data);
      if (status == 200) {
        console.log('log updated');
        res.redirect('/history');
      }
    })
    .catch((error) => {
      console.error(error);
    });
  } catch (error) {
    console.error(error);
  }
};

//UPDATED FOR API - delete the mood log from the database
exports.deleteMoodLog = (req, res) => {
  const endpoint = `http://localhost:3001/delete/${req.params.id}`;
  axios
  .delete(endpoint, {
    validateStatus: function (status) {
      return status < 500;
    }
  })
  .then((response) => {
    const status = response.status;
    console.log(response.data);
    if (status == 200) {
      console.log('log deleted');
      res.redirect('/history');
    }
  })
  .catch((error) => {
    console.error(error);
  });
};

//UPDATED FOR API - load the chart screen of the web app
exports.getChart = (req, res) => {
  var userinfo = {}; //userinfo is an array that will be used to store the user's name and user_id
  const {isloggedin, user_id} = req.session;
  //enjoyment, sadness, anger, contempt, disgust, fear, surprise
  
  const endpoint = `http://localhost:3001/chart/${user_id}`;

  axios
  .get(endpoint, {
    validateStatus: function (status) {
      return status < 500;
    }
  })
  .then((response) => {
    const status = response.status;
    console.log(response.data);
    if (status == 200) {
      console.log('data retreived');
      const chartinput = response.data.chartinput;
      const charttriggers = response.data.charttriggers;
      const chartempty = response.data.chartempty;
      const charttime = response.data.charttime;
      res.render('chart', {chartinput: chartinput, charttriggers: charttriggers, charttime: charttime, loggedin: isloggedin, userinfo: req.session.name, chartempty : chartempty});
    } else {
      console.log('no data');
      res.render('chart', {chartinput: [], charttriggers: [], charttime: [], loggedin: isloggedin, userinfo: req.session.name, chartempty: true});
    }
  })
  .catch((error) => {
    console.error(error);
  });
};