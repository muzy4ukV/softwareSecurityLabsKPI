const express = require('express');
const bodyParser = require('body-parser');
const port = 3000;
const { auth } = require('express-oauth2-jwt-bearer');
const axios = require('axios');
const querystring = require('querystring');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const domain = 'dev-nkezavm36o8pdhba.us.auth0.com';
const clientId = 'cAY5VTOGPxBlTJPgLyDCMWl9jaDR50BP';
const clientSecret = '2yPUof4FFvOhmf5-olsyzj_pZ3w_ZcqC5hiy2sTnCgnRQhDgEAynD3OTpOg9y534';
const redirectUri = 'http://localhost:3000/private';


app.get('/', (req, res) => {
	return res.redirect(
        `https://${domain}/authorize?client_id=${clientId}`+
		"&scope=offline_access openid"+ 
		"&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fprivate"+
		"&response_type=code"+
		"&response_mode=query");
});

app.post('/api/login', (req, res) => {
    if(req.query.code){
        res.sendFile(path.join(__dirname+'/index.html'))
    }
    res.redirect('/');
});


app.get('/private', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code is missing' });
    }

    try {
        const tokenResponse = await axios.post(
            `https://${domain}/oauth/token`,
            querystring.stringify({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const accessToken = tokenResponse.data.access_token;

        // Отримання інформації про користувача
        const userInfoResponse = await axios.get(`https://${domain}/userinfo`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const userInfo = userInfoResponse.data;

        // Відповідь із даними користувача
        res.json({
            message: 'Your token is valid and you have private access!',
            user: userInfo,
        });
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to fetch access token or user info' });
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})