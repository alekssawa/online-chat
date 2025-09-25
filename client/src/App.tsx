import { Routes, Route } from "react-router-dom";
import General from "./pages/General/General";
import ChatRoom from "./pages/ChatRoom/ChatRoom";

// import Footer from "./components/footer/Footer";
// import Header from "./components/header/Header";

function App() {
  return (
    <>
      {/* <Header /> */}
      <Routes>
        <Route path="/" element={<General />} />
        <Route path="/Chat" element={<ChatRoom />} />
      </Routes>
      {/* <Footer /> */}
    </>
  );
}

export default App;
