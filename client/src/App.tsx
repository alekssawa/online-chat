import { Route, Routes } from 'react-router-dom'
import General from './pages/AuthPage/AuthPage'
import ChatPage from './pages/ChatPage/ChatPage'

// import Footer from "./components/footer/Footer";
// import Header from "./components/header/Header";

function App() {
	return (
		<>
			{/* <Header /> */}
			<Routes>
				<Route path='/' element={<General />} />
				<Route path='/Chat' element={<ChatPage />} />
			</Routes>
			{/* <Footer /> */}
		</>
	)
}

export default App
