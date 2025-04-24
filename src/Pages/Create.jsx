import React from 'react';
import '../App.css';

const Create = () => {
  return (
    <div className="create-page">
        <form>
        <input type="text" placeholder='Title'/>
        <input type="text" placeholder='Content (Optional)'/>
        <input type="text" placeholder='Image URL (Optional)' />
        <button type='submit'>Create Post</button>
      </form>
    </div>
  );
};

export default Create;