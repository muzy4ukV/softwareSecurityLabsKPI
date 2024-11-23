const express = require('express');
const bodyParser = require('body-parser');
const port = 3000;
const { auth } = require('express-oauth2-jwt-bearer');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const domain = 'dev-x5y5pre5iu10gohp.us.auth0.com';

const checkJwt = auth({
    audience: `https://${domain}/api/v2/`,
    issuerBaseURL: `https://${domain}`,
  });


app.get('/', (req, res) => {
	return res.redirect(
        `https://${domain}/authorize?client_id=EO06XRRIezpjy5foORAjTvVPnaWXcr6t`+
		"&scope=offline_access"+ 
		"&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Flogin"+
		"&response_type=code"+
		"&response_mode=query");
});

app.post('/api/login', (req, res) => {
    if(req.query.code){
        res.sendFile(path.join(__dirname+'/index.html'))
    }
    res.redirect('/');
});

app.get('/private', checkJwt, (req, res) =>{
	res.json({
        message: 'Your token is valid and you have private access!'
    })
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
