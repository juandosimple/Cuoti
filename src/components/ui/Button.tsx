import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', ...props }, ref) => {

        // Mapping variants to CSS classes (assuming we add them to index.css or use inline styles for now)
        // I will add these classes to index.css in a subsequent step or just use inline styles here for simplicity if user wants "No Tailwind".

        const baseStyle: React.CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius)',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            border: 'none',
        };

        const variantStyles: Record<string, React.CSSProperties> = {
            default: {
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
            },
            outline: {
                border: '1px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
            },
            ghost: {
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
            },
            destructive: {
                backgroundColor: 'var(--danger)',
                color: '#fff',
            },
        };

        const sizeStyles: Record<string, React.CSSProperties> = {
            default: { height: '2.5rem', padding: '0 1rem' },
            sm: { height: '2.25rem', padding: '0 0.75rem' },
            lg: { height: '2.75rem', padding: '0 2rem' },
            icon: { height: '2.5rem', width: '2.5rem', padding: 0 },
        };

        return (
            <button
                style={{ ...baseStyle, ...variantStyles[variant], ...sizeStyles[size] }}
                className={cn("", className)}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
