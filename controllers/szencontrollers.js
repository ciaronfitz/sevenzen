const e = require('express');
const bcrypt = require('bcrypt');
const conn = require('./../utils/dbconn');

//load the home screen of the web app
exports.getHome = (req, res) => {

    var userinfo = {}; //userinfo is an array that will be used to store the user's name and user_id
    var username; //username is a string that will be used to store the user's name
    const {isloggedin, user_id, name} = req.session; //isloggedin is a boolean that will be used to check if the user is logged in, user_id is an integer that will be used to store the user's id, name is a string that will be used to store the user's name
    console.log(`User data is ${isloggedin} and ${user_id}`); 
    const session=req.session; //session is an object that will be used to store the user's session data

    //if the user is logged in, the user's name will be stored in the username variable
    res.render('index', {loggedin: isloggedin, userinfo: session.name});
        
};

//load the mood logger screen of the web app
exports.getLogger = (req, res) => {
    var userinfo = {}; //userinfo is an array that will be used to store the user's name and user_id
    const {isloggedin, userid} = req.session;
    const session=req.session; //session is an object that will be used to store the user's session data
    console.log(session);
    console.log(session.isloggedin);
    console.log(session.user_id);

    //load the emotions and triggers from the database
    const selectSQL = 'SELECT * FROM emotion; SELECT * FROM emotrigger';
    conn.query(selectSQL, (err, rows) => {
      if (err) {
        throw err;
      } else {
        const selectemotions = rows[0];//selectemotions is an array that will be used to store the emotions
        const selecttriggers = rows[1];//selecttriggers is an array that will be used to store the triggers
        const userinfo = {name: req.session.name};
        //render the log screen with the emotions and triggers from the database
        console.log(session.name);
        res.render('log', { selectemotions, selecttriggers, loggedin: isloggedin, userinfo: session.name});
      }
    });
};

//post the mood log to the database
exports.postNewMoodLog = (req, res) => {
  const isLoggedin = req.session.isloggedin; //isLoggedin is a boolean that will be used to check if the user is logged in
  const user_id = req.session.user_id; //user_id is an integer that will be used to store the user's id
  const { enjoyment, sadness, anger, contempt, disgust, fear, surprise, trigger, usernotes } = req.body; //get details from the request body to store in variables
  const vals = [user_id, sadness, anger, contempt, disgust, fear, surprise, trigger, usernotes]; //vals is an array that will be used to store the user's id, emotion name, emotion intensity and user notes
  var emotion_id = 0; //emotion_id is an integer that will be used to store the emotion's id
  var emotrigger_id = []; //emotrigger_id is an array that will be used to store the triggers' ids - this is necessary because a user can select multiple triggers
  console.log(req.body);

  // Function to execute a query and return a promise - code adapted from https://stackoverflow.com/questions/31413749/node-mysql-queries-in-a-promise-chain
  function executeQuery(sql, values) {
    return new Promise((resolve, reject) => {
      conn.query(sql, values, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Get emotrigger_ids from triggers into new array for adding to emotrigger_emotion_log table
const triggerarray = Array.isArray(trigger) ? trigger : [trigger];
const getEmotriggersPromises = triggerarray.map((element) => {
    const getEmotriggersSQL = `SELECT emotrigger_id FROM emotrigger WHERE emotrigger_name = ?`;
    return executeQuery(getEmotriggersSQL, [element]);
});

Promise.all(getEmotriggersPromises)
    .then((results) => {
      console.log(results);
        const emotrigger_id = results.map((rows) => rows[0].emotrigger_id);

        const insertSQL = `INSERT INTO emotion_log (emotion_log_id, time_stamp, user_id, enjoyment, sadness, anger, contempt, disgust, fear, surprise, user_notes) VALUES (NULL, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?); SELECT LAST_INSERT_ID()`;

        return executeQuery(insertSQL, [user_id, enjoyment, sadness, anger, contempt, disgust, fear, surprise , usernotes])
            .then((rows) => {
                const lastInsertId = rows[1][0]['LAST_INSERT_ID()'];

                const insertPromises = emotrigger_id.map((element) => {
                    const insertSQL = `INSERT INTO emotrigger_emotion_log VALUES (NULL, ?, ?)`;
                    return executeQuery(insertSQL, [element, lastInsertId]);
                });

                return Promise.all(insertPromises);
            });
    })
    .then(() => {
        console.log('All queries done');
        res.redirect('/');
    })
    .catch((err) => {
        throw err;
    });
};

//load the mood history screen of the web app
exports.getMoodHistory = (req, res) => {
        var userinfo = {}; //userinfo is an array that will be used to store the user's name and user_id
        const {isloggedin, userid} = req.session;
        const user_id = req.session.user_id;
        const name = req.session.name;
        const session=req.session; //session is an object that will be used to store the user's session data
        //load the user's mood history from the database
        const selectSQL = 'SELECT time_stamp, enjoyment, sadness, anger, contempt, disgust, fear, surprise, user_notes, emotion_log_id FROM emotion_log WHERE user_id = ?';
        conn.query(selectSQL, user_id, (err, rows) => {
          //if there is an error, handle it - code adapted from https://www.w3schools.com/nodejs/nodejs_mysql_select.asp and https://www.w3schools.com/js/js_errors.asp
          try {
              conn.query(selectSQL, user_id, (err, rows) => {
                if (err) {
                  console.error(err);
                } else {
                  //if there is no error, render the mood history screen with the user's mood history
                  const userinfo = { name: req.session.name };
                  res.render('history', { history: rows, loggedin: isloggedin, userinfo: session.name });
                }
              });
            } catch (err) {
              console.error(err);
            };
        });
      };

//load the log in screen of the web app
exports.getLoginScreen = (req, res) => {
    var userinfo = {};
    const {isloggedin, userid, loginSuccessful} = req.session;
    res.render('login', {loggedin: isloggedin, loginSuccessful: true});
};

//load the registration screen of the web app
exports.getRegistrationScreen = (req, res) => {
    var userinfo = {};
    res.render('register', {loggedin: false, emailExists: false});
};

//post the registration details to the database
exports.postregistration = async (req, res) => {
    const {firstname, lastname, useremail, password_new} = req.body;
    const hashedPassword = await bcrypt.hash(password_new, 13);
    const vals = [firstname, lastname, useremail, hashedPassword];
    console.log(vals);
    var registration_successful;

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
};

//post the login details to the database
exports.postLogin = async (req,res) => {
    const {useremail, userpass} = req.body;
    console.log(useremail, userpass);
    const vals = [useremail, userpass ];
    console.log(vals);

    const checkUserSQL = `SELECT user_id, first_name, password FROM user WHERE email = ?`;

    conn.query(checkUserSQL, vals, (err, rows) => {
    if (err) throw err;

    const numrows = rows.length;
    if (numrows > 0) {
      const isMatch = bcrypt.compare(userpass, rows[0].password);
      if (isMatch) {
      console.log('found user');
      console.log(rows);
      const session = req.session;
      session.isloggedin = true;
      session.user_id = rows[0].user_id;
      session.name = rows[0].first_name;
      session.loginSuccessful = 'pass';
      console.log(session);
      res.redirect(req.session.route || '/');
      }
    } else {
      console.log('user not found');
      const session = req.session;
      session.isloggedin = false;
      session.loginSuccessful = "fail";
      // Change this line to redirect to the login page
      res.render('login', { loggedin: false, loginSuccessful: false,});
    };
  });
};

//log the user out of the web app
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};

//load the edit log screen of the web app
exports.selectLog = (req, res) => {
  const {isloggedin, user_id} = req.session;
  let verified_id;
  const session=req.session; //session is an object that will be used to store the user's session data
  const emotion_log_id = req.params.id;
  const selectSQL = `SELECT * FROM emotrigger; SELECT * FROM emotion_log INNER JOIN emotrigger_emotion_log ON emotion_log.emotion_log_id = emotrigger_emotion_log.emotion_log_id INNER JOIN emotrigger ON emotrigger_emotion_log.emotrigger_id = emotrigger.emotrigger_id WHERE emotion_log.emotion_log_id = ${emotion_log_id}`;
  conn.query(selectSQL, (err, rows) => {
    if (err) {
      throw err;
    } else {
      console.log(selectSQL);
      console.log(rows);
      const selecttriggers = rows[0];//selecttriggers is an array that will be used to store the triggers
      const details = rows[1];//details is an array that will be used to store the details of the mood log
      const triggers = rows[1].map(row => row.emotrigger_name); // Extract emotrigger_name values
      verified_id = details[0].user_id;
      console.log(details);
      console.log(verified_id);
      console.log(triggers);
      //ensure that the user is logged in and that the user is the owner of the mood log
      if (user_id != verified_id) {
        console.log(user_id);
        console.log(verified_id);
        res.redirect('/');
      }
      console.log(details[0].enjoyment)
      res.render('editlog', { details, triggers, selecttriggers, loggedin: isloggedin, userinfo: session.name });
    }
  });
};

//edit the mood log in the database
exports.editMoodLog = async (req, res) => {
  try {
    const { enjoyment, sadness, anger, contempt, disgust, fear, surprise, trigger, usernotes } = req.body; //get details from the request body to store in variables
    let triggers = Array.isArray(trigger) ? trigger : [trigger];
    triggers = triggers.map(trigger => trigger.replace(/\r\n/g, ''));
    // Remove empty elements from the 'triggerArray'
    triggers = triggers.filter(trigger => trigger.trim() !== '');
    const trigger_id = [];

    // Get emotrigger_id from trigger_name
    const getEmotriggersSQL = `SELECT emotrigger_id FROM emotrigger WHERE emotrigger_name = ?`;
    const getTriggerIdPromises = triggers.map((trigger) => {
      return new Promise((resolve, reject) => {
        conn.query(getEmotriggersSQL, [trigger], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            trigger_id.push(rows[0].emotrigger_id);
            resolve();
          }
        });
      });
    });

    await Promise.all(getTriggerIdPromises); // Wait for all queries to complete

    //remove existing emotrigger_emotion_log entries
    const deleteSQL = `DELETE FROM emotrigger_emotion_log WHERE emotion_log_id = ?`;
    await new Promise((resolve, reject) => {
      conn.query(deleteSQL, [req.params.id], (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Deleted existing triggers');
          resolve();
        }
      });
    });

    //add new emotrigger_emotion_log entries
    const insertSQL = `INSERT INTO emotrigger_emotion_log VALUES (NULL, ?, ?)`;
    const insertPromises = trigger_id.map((trigger) => {
      return new Promise((resolve, reject) => {
        conn.query(insertSQL, [trigger, req.params.id], (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });

    await Promise.all(insertPromises); // Wait for all queries to complete

    // Update emotion_log table
    let updateSQL;
    if (usernotes == '') {
      updateSQL = `UPDATE emotion_log SET enjoyment=?, sadness=?, anger=?, contempt=?, disgust=?, fear=?, surprise=? WHERE emotion_log_id = ?`;
    } else {
      updateSQL = `UPDATE emotion_log SET enjoyment=?, sadness=?, anger=?, contempt=?, disgust=?, fear=?, surprise=?, user_notes=? WHERE emotion_log_id = ?`;
    }

    await new Promise((resolve, reject) => {
      conn.query(updateSQL, usernotes == '' ? [enjoyment, sadness, anger, contempt, disgust, fear, surprise, req.params.id] : [enjoyment, sadness, anger, contempt, disgust, fear, surprise, usernotes, req.params.id], (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Updates complete');
          resolve();
        }
      });
    });

    res.redirect('/');
  } catch (err) {
    console.error(err);
    // Handle errors
  }
};

//delete the mood log from the database
exports.deleteMoodLog = (req, res) => {
  // delete from emotrigger_emotion_log
  const deleteTriggerSQL = `DELETE FROM emotrigger_emotion_log WHERE emotion_log_id = ?`;
  conn.query(deleteTriggerSQL, [req.params.id], (err) => {
    if (err) {
      throw err;
    }
  });
  // delete from emotion_log
  const deleteSQL = `DELETE FROM emotion_log WHERE emotion_log_id = ?`;
  conn.query(deleteSQL, [req.params.id], (err) => {
    if (err) {
      throw err;
    }
    res.redirect('/');
  });
};

exports.getNewMoodLog = (req, res) => {
  var userinfo = {}; //userinfo is an array that will be used to store the user's name and user_id
  const {isloggedin, userid} = req.session;
  const session=req.session; //session is an object that will be used to store the user's session data
  console.log(session);
  console.log(session.isloggedin);
  console.log(session.user_id);

  //load the emotions and triggers from the database
  const selectSQL = 'SELECT * FROM emotrigger';
  conn.query(selectSQL, (err, rows) => {
    if (err) {
      throw err;
    } else {
      const selectemotions = rows[0];//selectemotions is an array that will be used to store the emotions
      const selecttriggers = rows[1];//selecttriggers is an array that will be used to store the triggers
      const userinfo = {name: req.session.name};
      //render the log screen with the emotions and triggers from the database
      console.log(session.name);
      res.render('log_updated', { selectemotions, selecttriggers, loggedin: isloggedin, userinfo: session.name});
    }
  });
};

exports.getChart = (req, res) => {
  var userinfo = {}; //userinfo is an array that will be used to store the user's name and user_id
  const {isloggedin, user_id} = req.session;
  //enjoyment, sadness, anger, contempt, disgust, fear, surprise
  
  const averagesSQL = 'SELECT AVG(enjoyment) AS avg_enjoyment, AVG(sadness) AS avg_sadness, AVG(anger) AS avg_anger, AVG(contempt) AS avg_contempt, AVG(disgust) AS avg_disgust, AVG(fear) AS avg_fear, AVG(surprise) AS avg_surprise FROM emotion_log WHERE user_id=?;';
  conn.query(averagesSQL, req.session.user_id, (err, averages) => {
    if (err) {
      throw err;
    } else {
      console.log(averages[0]);
      const userinfo = {name: req.session.name};
      if (averages[0].avg_enjoyment === null) {
        res.render('chart', {chartinput: averages[0], charttriggers: [], loggedin: isloggedin, userinfo: req.session.name, chartempty: true});
      } else {
          const triggersSQL = 'SELECT emotrigger.emotrigger_name, AVG(emotion_log.enjoyment) AS avg_enjoyment, AVG(emotion_log.sadness) AS avg_sadness, AVG(emotion_log.anger) AS avg_anger, AVG(emotion_log.contempt) AS avg_contempt, AVG(emotion_log.disgust) AS avg_disgust, AVG(emotion_log.fear) AS avg_fear, AVG(emotion_log.surprise) AS avg_surprise FROM emotion_log INNER JOIN emotrigger_emotion_log ON emotion_log.emotion_log_id = emotrigger_emotion_log.emotion_log_id INNER JOIN emotrigger ON emotrigger_emotion_log.emotrigger_id = emotrigger.emotrigger_id GROUP BY emotrigger.emotrigger_name';
          conn.query(triggersSQL, (err, triggers) => {
          if (err) {
      throw err;
      } else {
        if (triggers.length === 0) {
          res.render('chart', {chartinput: averages[0], charttriggers: triggers, loggedin: isloggedin, userinfo: req.session.name, chartempty: true});
        } else {
          console.log(triggers);
          res.render('chart', {chartinput: averages[0], charttriggers: triggers, loggedin: isloggedin, userinfo: req.session.name, chartempty: false});
        }
     }
    });
      }
    }
  });
  

};