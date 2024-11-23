const uuid = require('uuid');
const jwt = require("jsonwebtoken");
const express = require('express');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const request = require('request');
const port = 3000;
const fs = require('fs');
const { auth } = require('express-oauth2-jwt-bearer');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'Authorization';

const domain = "dev-nkezavm36o8pdhba.us.auth0.com"

const checkJwt = auth({
    audience: `https://${domain}/api/v2/`,
    issuerBaseURL: `https://${domain}`,
});

class Session {
    #sessions = {}

    constructor() {
        try {
            this.#sessions = fs.readFileSync('./sessions.json', 'utf8');
            this.#sessions = JSON.parse(this.#sessions.trim());

            console.log(this.#sessions);
        } catch(e) {
            this.#sessions = {};
        }
    }

    #storeSessions() {
        fs.writeFileSync('./sessions.json', JSON.stringify(this.#sessions), 'utf-8');
    }

    set(key, value) {
        if (!value) {
            value = {};
        }
        this.#sessions[key] = value;
        this.#storeSessions();
    }

    get(key) {
        return this.#sessions[key];
    }

    init(res) {
        const sessionId = uuid.v4();
        this.set(sessionId);

        return sessionId;
    }

    destroy(req, res) {
        const sessionId = req.sessionId;
        delete this.#sessions[sessionId];
        this.#storeSessions();
    }
}

const sessions = new Session();


app.use((req, res, next) => {
    let currentSession = {};
    let sessionId = req.get(SESSION_KEY);

    if (sessionId) {
        currentSession = sessions.get(sessionId);
        if (!currentSession) {
            currentSession = {};
            sessionId = sessions.init(res);
        }
    } else {
        sessionId = sessions.init(res);
    }

    req.session = currentSession;
    req.sessionId = sessionId;

    onFinished(req, () => {
        const currentSession = req.session;
        const sessionId = req.sessionId;
        sessions.set(sessionId, currentSession);
    });

    next();
});

app.get('/', (req, res) => {
	
    let auth = req.get("Authorization");
	
	if(!auth){
		res.sendFile(path.join(__dirname+'/index.html'));;
		return;
	}

    const options = { 
        method: "GET",
        uri: `https://${domain}/userinfo`,
        headers: { "Authorization": "Bearer " + auth }
      };
      
      request(options, function (error, response, body) {
              if (!error && response.statusCode == 200) {
                  var body_res = JSON.parse(body);
                  return res.json({
                      username: body_res.nickname,
                      logout: `http://localhost:${port}/logout`
                  });
              }
              else{
                  res.status(401).send(body);
              }
      });
})

app.get('/logout', checkJwt, (req, res) => {
    sessions.destroy(req, res);
    res.redirect('/');
});

let details = {
    audience: `https://${domain}/api/v2/`,
    grant_type: 'client_credentials',
    client_id: 'cAY5VTOGPxBlTJPgLyDCMWl9jaDR50BP',
    client_secret: '2yPUof4FFvOhmf5-olsyzj_pZ3w_ZcqC5hiy2sTnCgnRQhDgEAynD3OTpOg9y534'
};

app.post('/api/login', (req, res) => {
    const { login, password } = req.body;

	
	let options = {
        uri:  `https://${domain}/oauth/token`,
		body: JSON.stringify(details),
        method: 'POST',
		headers: {
                    'Content-Type': 'application/json'
                }
    };
	
	request(options, function (error, response, body) {
		if(error){
			res.status(401).send();
		}
		if (!error && response.statusCode == 200) {
            const parsedBody = JSON.parse(body);
		    let user_details = {
				grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
				username: login,
				password: password,
				audience:  `https://${domain}/userinfo`,
				client_id: details.client_id,
				client_secret: details.client_secret,
				realm: 'Username-Password-Authentication',
				scope: 'offline_access'
			};
	
			let user_options = {
				uri: `https://${domain}/oauth/token`,
				body: JSON.stringify(user_details),
				method: 'POST',
				headers: {
							'Content-Type': 'application/json',
							'Authorization' : 'Bearer ' + parsedBody.access_token
						}
			};
	
			request(user_options, function (error, response, body) {
				if(error){
					res.status(401).send();
				}

                if(response.statusCode == 403){
                    return res.status(403).send(body);
                }
		
				if (!error && response.statusCode == 200) {
					var body_res = JSON.parse(body);
					res.json({ token: body_res.access_token,
							   refresh_token: body_res.refresh_token });
				}	
			});
		}	
	});
});


app.post('/api/register', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const managementOptions = {
        method: 'POST',
        uri: `https://${domain}/oauth/token`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: details.client_id,
            client_secret: details.client_secret,
            audience: `https://${domain}/api/v2/`,
            grant_type: 'client_credentials',
        }),
    };

    request(managementOptions, (err, response, body) => {
        if (err || response.statusCode !== 200) {
            return res.status(500).json({ error: 'Failed to get Management API token' });
        }

        const accessToken = JSON.parse(body).access_token;

        const createUserOptions = {
            method: 'POST',
            uri: `https://${domain}/api/v2/users`,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
                connection: 'Username-Password-Authentication',
            }),
        };

        request(createUserOptions, (err, response, body) => {
            if (err || response.statusCode >= 400) {
                return res.status(400).json({ error: 'Failed to register user', details: body });
            }

            res.status(201).json({ message: 'User registered successfully!' });
        });
    });
});

app.get('/private', checkJwt, (req, res) =>{
	res.json({
        message: 'Your token is valid and you have private access!'
    })
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
