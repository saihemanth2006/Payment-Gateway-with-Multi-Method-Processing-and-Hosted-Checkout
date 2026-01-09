import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Checkout from './pages/Checkout';
import CreateOrder from './pages/CreateOrder';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<CreateOrder />} />
                <Route path="/checkout" element={<Checkout />} />
            </Routes>
        </BrowserRouter>
    );
}
export default App;
