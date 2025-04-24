import React from 'react';
import '../App.css';
import PostCard from '../Components/PostCard';
import Filter from '../Components/Filter';


const Home = () => {

    return (
        <div className="home-page">
            <Filter></Filter>
            <PostCard title="testing"></PostCard>
        </div>
    )
}

export default Home;