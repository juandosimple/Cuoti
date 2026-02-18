import logo from '../assets/logo_cuoti.svg';
import './Loader.css';

export const Loader = ({ size = 64, className = '' }: { size?: number, className?: string }) => {
    return (
        <div className={`loader-container ${className}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img
                src={logo}
                alt="Loading..."
                width={size}
                height={size}
                className="loader-logo"
            />
        </div>
    );
};
