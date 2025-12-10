import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'

import './styles/common.css'
import './styles/reset.css'
// import { ApolloProvider } from "@apollo/client/react";
import { AuthProvider } from './context/AuthProvider'
// import { client } from "./apollo/client";

ReactDOM.createRoot(document.getElementById('root')!).render(
	// <React.StrictMode>
	<BrowserRouter>
		<AuthProvider>
			<App />
		</AuthProvider>
	</BrowserRouter>
	// </React.StrictMode>,
)
