const knexion = require('../../connection');

function fetchArticle(article_id) {
  return knexion
    .select('articles.*')
    .from('articles')
    .where('articles.article_id', article_id)
    .count({ comment_count: 'comments.article_id' })
    .leftJoin('comments', 'articles.article_id', 'comments.article_id')
    .groupBy('articles.article_id')
    .then(response => {
      if (!response.length) {
        return Promise.reject({ status: 404, msg: 'Article does not exist' });
      } else {
        response[0].comment_count = +response[0].comment_count;
        return response;
      }
    });
}

function amendArticle(article_id, body) {
  // if (!body.hasOwnProperty("inc_votes") && body isnt empty) {
  //   return Promise.reject({ status: 400, msg: "Malformed body" });
  // }
  return knexion('articles')
    .where('article_id', '=', article_id)
    .increment('votes', body.inc_votes || 0)
    .returning('*');
}

function prepostComment(article_id, comment) {
  if (!comment.hasOwnProperty('username') || !comment.hasOwnProperty('body')) {
    return Promise.reject({ status: 400, msg: 'Malformed body' });
  } else
    return knexion('comments')
      .insert({
        author: comment.username,
        body: comment.body,
        article_id: article_id
      })
      .returning(['comment_id', 'author', 'votes', 'created_at', 'body']);
}

function checkParentArticleExists(id) {
  return knexion('articles')
    .select('*')
    .where('article_id', '=', id)
    .then(existentArticleArray => {
      if (!existentArticleArray.length) {
        return Promise.reject({ status: 404, msg: 'Article does not exist' });
      }
    });
}

function checkOrder(order) {
  if (order != 'asc' && order != 'desc') {
    return Promise.reject({ status: 400, msg: 'Order must be asc or desc' });
  }
}

function fetchComments(article_id, sort_by, order) {
  if (order) {
    if (order !== 'asc' && order !== 'desc')
      return Promise.reject({ status: 400, msg: 'Order must be asc or desc' });
  }

  return knexion('comments')
    .select('comment_id', 'author', 'votes', 'created_at', 'body')
    .where('article_id', '=', article_id)
    .orderBy(sort_by || 'created_at', order || 'desc');
}

function checkColumnExists(column) {
  if (column === 'comment_count') Promise.resolve();
  else {
    return knexion.schema.hasColumn('comments', column).then(response => {
      if (!response) {
        return Promise.reject({
          status: 400,
          msg: 'Sort by column does not exist'
        });
      }
    });
  }
}

function fetchArticles(sort_by, order, author, topic) {
  return knexion('articles')
    .select('articles.*')
    .count({ comment_count: 'comments.article_id' })
    .orderBy(sort_by || 'articles.created_at', order || 'desc')
    .modify(query => {
      if (author) query.where('articles.author', '=', author);
      if (topic) query.where('articles.topic', '=', topic);
    })
    .leftJoin('comments', 'articles.article_id', 'comments.article_id')
    .groupBy('articles.article_id')
    .then(articles => {
      articles.forEach(article => {
        article.comment_count = +article.comment_count;
      });
      return articles;
    });
}

function checkUserExists(username) {
  return knexion('users')
    .select('*')
    .where('username', '=', username)
    .then(existentUserArray => {
      if (!existentUserArray.length) {
        return Promise.reject({ status: 404, msg: 'User does not exist' });
      }
    });
}

function checkTopicExists(topic) {
  return knexion('topics')
    .select('*')
    .where('slug', '=', topic)
    .then(existentTopicArray => {
      if (!existentTopicArray.length) {
        return Promise.reject({ status: 404, msg: 'Topic does not exist' });
      }
    });
}

module.exports = {
  fetchArticle,
  amendArticle,
  prepostComment,
  checkParentArticleExists,
  fetchComments,
  fetchArticles,
  checkUserExists,
  checkTopicExists,
  checkColumnExists,
  checkOrder
};
