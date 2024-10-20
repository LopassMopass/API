const express = require('express');
const db = require('./dbs');
const app = express();
app.use(express.json()); // This middleware is used to parse JSON bodies.

app.listen(3000, () => console.log('Server running on port 3000'));

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

// POST - Post a blog post into the database
app.post('/api/blogs', async (req, res) => {
    const { text, date_of_creation, author } = req.body;

    if (!text || !date_of_creation || !author) {
        return res.status(400).send('Missing required fields/types: text, date_of_creation, author');
    }

    try {
        const result = await db.query(
            'INSERT INTO blogs (text, date_of_creation, author) VALUES (?, ?, ?)',
            [text, date_of_creation, author]
        );
        res.status(201).send({ message: 'Blog post created', blogId: result.insertId });
    } catch (error) {
        res.status(500).send('Error creating a blog post');
    }
});

// PATCH - Updates a part of a blog post by ID (NEBUDE PODLE ME FUNGOVAT!!!!!!!!!!!!)
app.patch('/api/blogs/:blogId/:field', async (req, res) => {
    const blogId = req.params.blogId;
    const field = req.params.field;
    const value = req.body.value; // Mozna chyba

    const allowedFields = {
        'texts': 'text',
        'dates': 'date_of_creation',
        'authors': 'author'
    };

    if (!allowedFields[field]) {
        return res.status(400).send('Invalid field to update');
    }

    try {
        const result = await db.query(`UPDATE blogs SET ${allowedFields[field]} = ? WHERE id = ?`, [value, blogId]);
        if (result.affectedRows === 0) {
            return res.status(404).send('Error 404: Cannot update blog that does not exist.');
        }
        res.status(200).send('Blog post updated');
    } catch (error) {
        res.status(500).send('Error updating blog post');
    }
});

// DELETE - Delete a blog post by ID
app.delete('/api/blogs/:blogId', async (req, res) => {
    const blogId = req.params.blogId;

    try {
        const result = await db.query('DELETE FROM blogs WHERE id = ?', [blogId]);
        if (result.affectedRows === 0) {
            return res.status(404).send('Error 404: Cannot delete blog that does not exist.');
        }
        res.status(200).send('Blog post deleted');
    } catch (error) {
        res.status(500).send('Error deleting blog post');
    }
})