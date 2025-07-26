import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [entry, setEntry] = useState('');
  const [tags, setTags] = useState('');
  const [posts, setPosts] = useState([]);
  const [editPostId, setEditPostId] = useState(null);
  const [editEntry, setEditEntry] = useState('');
  const [editTags, setEditTags] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    if (currentUser) {
      const q = query(
        collection(db, 'posts'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const unsubscribePosts = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(postsData);
        setPosts(postsData);
      });
      return () => unsubscribePosts();
    } else {
      setPosts([]);
    }
  });
  return () => unsubscribeAuth();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setEmail('');
      setPassword('');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      alert(`Error signing out: ${error.message}`);
    }
  };

  const handleSubmitEntry = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'posts'), {
        content: entry,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        createdAt: new Date().toISOString(),
        userId: user.uid
      });
      setEntry('');
      setTags('');
    } catch (error) {
      alert(`Error saving entry: ${error.message}`);
    }
  };

  const handleEditPost = (post) => {
    setEditPostId(post.id);
    setEditEntry(post.content);
    setEditTags(post.tags.join(', '));
  };

  const handleUpdatePost = async (e) => {
    e.preventDefault();
    if (!user || !editPostId) return;
    try {
      const postRef = doc(db, 'posts', editPostId);
      await updateDoc(postRef, {
        content: editEntry,
        tags: editTags ? editTags.split(',').map(tag => tag.trim()) : [],
        createdAt: new Date().toISOString() // Update timestamp
      });
      setEditPostId(null);
      setEditEntry('');
      setEditTags('');
    } catch (error) {
      alert(`Error updating entry: ${error.message}`);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (error) {
      alert(`Error deleting entry: ${error.message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 min-h-screen bg-secondary">
      <h1 className="text-3xl font-bold text-primary mb-6 text-center">Simple daily diary</h1>
      {user ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">Logged in as {user.email}</span>
            <button
              onClick={handleSignOut}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>
          {editPostId ? (
            <form onSubmit={handleUpdatePost} className="space-y-4 mb-6">
              <textarea
                value={editEntry}
                onChange={(e) => setEditEntry(e.target.value)}
                placeholder="Edit your entry"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                rows="5"
                required
              />
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Edit tags (e.g., website, printing, webflow)"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white p-3 rounded-lg hover:bg-blue-700"
                >
                  Update Entry
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditPostId(null);
                    setEditEntry('');
                    setEditTags('');
                  }}
                  className="flex-1 bg-gray-500 text-white p-3 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitEntry} className="space-y-4 mb-6">
              <textarea
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="Write your entry (2-5 sentences). Nothing is also legit :)"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                rows="5"
                required
              />
              <input
                type="text"
                id="tags"
                name="tags"
                value={tags}
                autoComplete='false'
                autoCorrect='false'
                onChange={(e) => setTags(e.target.value)}
                placeholder="Optional tags (e.g., website, printing, webflow)"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="w-full bg-primary text-white p-3 rounded-lg hover:bg-blue-700"
              >
                Add Entry
              </button>
            </form>
          )}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <p className="text-gray-600 text-center">No entries yet.</p>
            ) : (
              posts.map(post => (
                <div key={post.id} className="p-4 bg-gray-50 rounded-lg shadow">
                  <p className="text-gray-800 break-words max-w-full">{post.content}</p>
                  <p className="text-sm text-gray-500">Tags: {post.tags.length ? post.tags.join(', ') : 'None'}</p>
                  <p className="text-sm text-gray-500">Posted: {new Date(post.createdAt).toLocaleString()}</p>
                  <div className="flex space-x-4 mt-2">
                    <button
                      onClick={() => handleEditPost(post)}
                      className="bg-primary text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-center">{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <button
              type="submit"
              className="w-full bg-primary text-white p-3 rounded-lg hover:bg-blue-700"
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-primary underline text-sm hover:text-blue-700"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;