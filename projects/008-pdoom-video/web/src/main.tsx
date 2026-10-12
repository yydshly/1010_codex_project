import { createRoot } from 'react-dom/client';
import App from './App';
import RenderPage from './RenderPage';
import './style.css';
createRoot(document.getElementById('root')!).render(location.pathname==='/render.html'?<RenderPage/>:<App/>);
