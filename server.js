const express = require('express');
const basicAuth = require('basic-auth');
const db = require('./dbs.js');
const path = require('path');
const app = express();
app.use(express.json());

app.listen(3000, () => console.log('Server running on port 3000'));

async function authenticate(req, res, next) {
    const user = basicAuth(req);
    if (!user) {
        res.set('WWW-Authenticate', 'Basic realm="example"');
        return res.status(401).send('Authentication required.');
    }

    try {
        // Check if user exists and password matches
        const [dbUser] = await db.query('SELECT * FROM users WHERE name = ?', [user.name]);
        if (dbUser && dbUser.password === user.pass) {
            req.user = { name: dbUser.name, role: dbUser.role };
            return next();
        }
    } catch (error) {
        return res.status(500).send('Error during authentication');
    }

    res.set('WWW-Authenticate', 'Basic realm="example"');
    res.status(401).send('Authentication required.');
}

// GET - Shows the endpoints of this API
app.get('/api/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'about.html'));
});

// GET - Fetch all blog posts
app.get('/api/blogs', async (req, res) => {
    try {
        const blogs = await db.query('SELECT * FROM blogs');
        res.status(200).json(blogs);
    } catch (error) {
        res.status(500).send('Error fetching a blog post');
    }
});

// GET - Fetch a blog post by ID
app.get('/api/blogs/:blogId', async (req, res) => {
    const blogId = req.params.blogId;

    try {
        const blogs = await db.query('SELECT * FROM blogs WHERE id = ?', [blogId]);
        if (blogs.length === 0) {
            return res.status(404).send('Error 404: Cannot find blog that does not exist.');
        }
        res.status(200).json(blogs[0]);
    } catch (error) {
        res.status(500).send('Error fetching blog post.');
    }
});

// POST - Register a new user
app.post('/api/register', async (req, res) => {
    const { name, password, role = 'user' } = req.body;

    if (!name || !password) {
        return res.status(400).send('Missing required fields: name, password');
    }

    try {
        await db.query('INSERT INTO users (name, password, role) VALUES (?, ?, ?)', [name, password, role]);
        res.status(201).send('User registered successfully');
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).send('User already exists');
        } else {
            res.status(500).send('Error registering user');
        }
    }
});

// POST - Post a blog post into the database
app.post('/api/blogs', authenticate, async (req, res) => {
    const { text, date_of_creation } = req.body;
    const author = req.user.name;

    if (!text || !date_of_creation) {
        return res.status(400).send('Missing required fields: text, date_of_creation');
    }

    try {
        const result = await db.query(
            'INSERT INTO blogs (text, date_of_creation, author, viewable_by) VALUES (?, ?, ?, ?)',
            [text, date_of_creation, author, 'everyone']
        );
        res.status(201).send({ message: 'Blog post created', blogId: result.insertId });
    } catch (error) {
        res.status(500).send('Error creating a blog post');
    }
});

// PATCH - Updates a part of a blog post by ID 
app.patch('/api/blogs/:blogId', authenticate, async (req, res) => {
    const blogId = req.params.blogId;
    const field = req.body.field;
    const value = req.body.value;
    const author = req.user.name;

    try {
        const [blog] = await db.query('SELECT * FROM blogs WHERE id = ?', [blogId]);
        if (!blog) return res.status(404).send('Blog post not found.');
        if (blog.author !== author && req.user.role !== 'admin') return res.status(403).send('Forbidden');

        await db.query(`UPDATE blogs SET ${field} = ? WHERE id = ?`, [value, blogId]);
        res.status(200).send('Blog post updated');
    } catch (error) {
        res.status(500).send('Error updating blog post');
    }
});

// PATCH - Set viewable users for a blog post
app.patch('/api/blogs/:blogId/viewers', authenticate, async (req, res) => {
    const blogId = req.params.blogId;
    const { viewable_by } = req.body;
    const author = req.user.name;

    try {
        const [blog] = await db.query('SELECT * FROM blogs WHERE id = ?', [blogId]);
        if (!blog) return res.status(404).send('Blog post not found.');
        if (blog.author !== author && req.user.role !== 'admin') return res.status(403).send('Forbidden');

        await db.query('UPDATE blogs SET viewable_by = ? WHERE id = ?', [viewable_by, blogId]);
        res.status(200).send('Viewers updated');
    } catch (error) {
        res.status(500).send('Error updating viewers');
    }
});

// DELETE - Delete a blog post by ID (admin override)
app.delete('/api/blogs/:blogId', authenticate, async (req, res) => {
    const blogId = req.params.blogId;
    const author = req.user.name;

    try {
        const [blog] = await db.query('SELECT * FROM blogs WHERE id = ?', [blogId]);
        if (!blog) return res.status(404).send('Blog post not found.');
        if (blog.author !== author && req.user.role !== 'admin') return res.status(403).send('Forbidden');

        await db.query('DELETE FROM blogs WHERE id = ?', [blogId]);
        res.status(200).send('Blog post deleted');
    } catch (error) {
        res.status(500).send('Error deleting blog post');
    }
});
