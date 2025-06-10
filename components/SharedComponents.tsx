
import React, { ReactNode, useState, useEffect } from 'react';
import { OrderStatus } from '../types';

// --- Simple Error Boundary to avoid blank pages on runtime errors ---
interface ErrorBoundaryProps { children: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error?: Error; }
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-red-700">
          <p className="font-semibold">Ocorreu um erro inesperado.</p>
          <pre className="whitespace-pre-wrap text-xs mt-2">{this.state.error?.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Icon Component (Simple Wrapper for Heroicons classes) ---
export const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.61 15.31 3.4 16.78L2.05 22L7.31 20.65C8.72 21.39 10.33 21.82 12.04 21.82C17.5 21.82 21.95 17.37 21.95 11.91C21.95 9.27 20.92 6.83 19.21 4.99S15.11 2 12.04 2M12.04 3.64C16.55 3.64 20.31 7.39 20.31 11.91C20.31 16.43 16.55 20.18 12.04 20.18C10.49 20.18 9.02 19.78 7.77 19.07L7.23 18.76L4.42 19.53L5.2 16.79L4.88 16.24C4.08 14.91 3.77 13.44 3.77 11.91C3.77 7.39 7.53 3.64 12.04 3.64M17.46 14.85C17.21 15.43 16.34 15.86 15.79 15.96C15.23 16.06 14.54 16.11 14.18 16.01C13.73 15.86 13.03 15.61 11.81 14.73C10.29 13.64 9.24 12.09 9.09 11.84C8.94 11.59 8.81 11.39 8.81 11.14C8.81 10.89 8.96 10.67 9.11 10.52C9.28 10.37 9.48 10.3 9.66 10.3C9.83 10.3 10.01 10.3 10.13 10.3C10.26 10.32 10.38 10.29 10.53 10.59C10.68 10.89 11.13 11.54 11.23 11.64C11.33 11.74 11.38 11.79 11.28 11.94C11.18 12.09 11.11 12.17 10.96 12.34C10.81 12.52 10.68 12.64 10.56 12.76C10.43 12.89 10.31 13.01 10.43 13.19C10.56 13.36 11.04 13.91 11.59 14.41C12.31 15.06 12.89 15.31 13.14 15.43C13.39 15.56 13.59 15.53 13.74 15.38C13.89 15.23 14.28 14.76 14.43 14.53C14.58 14.31 14.76 14.28 14.96 14.38C15.16 14.48 16.01 14.91 16.21 15.01C16.41 15.11 16.53 15.16 16.58 15.23C16.63 15.31 16.48 15.01 17.46 14.85Z" />
    </svg>
);

export const ClipboardDocumentIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
  </svg>
);


interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ease-in-out inline-flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed';
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  const variantStyles = {
    primary: 'bg-blu-primary text-white hover:bg-blu-primary/90 focus:ring-blu-primary disabled:bg-blu-primary/50',
    secondary: 'bg-white text-black border border-blu-accent hover:border-blu-primary disabled:text-black/40',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400',
    ghost: 'bg-transparent text-blu-primary hover:bg-blu-accent/50 focus:ring-blu-primary disabled:text-black/40',
    link: 'bg-transparent text-blue-600 hover:underline focus:ring-blue-500 disabled:text-gray-400 p-0',
  };
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyles} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Spinner size="sm" className="mr-2" />}
      {leftIcon && !isLoading && <span className="mr-2 flex items-center">{leftIcon}</span>}
      {children}
      {rightIcon && !isLoading && <span className="ml-2 flex items-center">{rightIcon}</span>}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  error?: string;
  inputClassName?: string;
  containerClassName?: string; 
}

export const Input: React.FC<InputProps> = ({ label, id, error, containerClassName = '', inputClassName = '', ...props }) => {
  const baseInputStyles = 'block w-full px-3 py-2 border border-black/20 rounded-md shadow-sm focus:outline-none focus:border-blu-primary focus:ring-2 focus:ring-blu-primary/50 sm:text-sm text-black disabled:bg-black/10 disabled:text-black/40 disabled:cursor-not-allowed';
  const errorInputStyles = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';

  return (
    <div className={containerClassName}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        id={id}
        className={`${baseInputStyles} ${errorInputStyles} ${inputClassName}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  id: string;
  error?: string;
  textareaClassName?: string;
  containerClassName?: string;
}
export const Textarea: React.FC<TextareaProps> = ({ label, id, error, containerClassName = '', textareaClassName = '', ...props }) => {
  const baseTextareaStyles = 'block w-full px-3 py-2 border border-black/20 rounded-md shadow-sm focus:outline-none focus:border-blu-primary focus:ring-2 focus:ring-blu-primary/50 sm:text-sm text-black disabled:bg-black/10 disabled:text-black/40 disabled:cursor-not-allowed';
  const errorTextareaStyles = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';
  return (
    <div className={containerClassName}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <textarea
        id={id}
        className={`${baseTextareaStyles} ${errorTextareaStyles} ${textareaClassName}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  id: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
  selectClassName?: string;
  containerClassName?: string;
  placeholder?: string; 
}

export const Select: React.FC<SelectProps> = ({ label, id, error, options, containerClassName = '', selectClassName = '', placeholder, ...props }) => {
  const baseSelectStyles = 'block w-full pl-3 pr-10 py-2 text-base border-black/20 focus:outline-none focus:border-blu-primary focus:ring-2 focus:ring-blu-primary/50 sm:text-sm rounded-md text-black disabled:bg-black/10 disabled:text-black/40 disabled:cursor-not-allowed';
  const errorSelectStyles = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';

  return (
    <div className={containerClassName}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select
        id={id}
        className={`${baseSelectStyles} ${errorSelectStyles} ${selectClassName}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | '2xl' | '3xl';
  footer?: ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', footer, className = '' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-full h-full',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col overflow-hidden ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3> 
            <button onClick={onClose} className="text-gray-400 hover:text-black/60">
              <i className="h-6 w-6 heroicons-outline-x-mark"></i>
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto flex-grow text-gray-800"> 
          {children}
        </div>
        {footer && (
          <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: string;
}

export function Spinner({ size = 'md', className = '', color = 'text-blue-600' }: SpinnerProps): React.ReactElement {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${color} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  actions?: ReactNode;
  titleClassName?: string;
  bodyClassName?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, actions, titleClassName='', bodyClassName='p-6 text-gray-800' }) => { 
  return (
    <div className={`bg-white shadow-md border border-black/10 rounded-lg overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className={`p-4 border-b border-black/10 flex justify-between items-center ${titleClassName}`}>
          {title && <h2 className="text-xl font-semibold text-gray-800">{title}</h2>}
          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}> 
        {children}
      </div>
    </div>
  );
};

interface PageTitleProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export const PageTitle: React.FC<PageTitleProps> = ({ title, subtitle, actions, className = '' }) => {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-black/60">{subtitle}</p>}
        </div>
        {actions && <div className="mt-4 md:mt-0 md:ml-4 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
};

interface AlertProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
  className?: string;
  details?: string;
  children?: ReactNode; // Added children prop
}

export const Alert: React.FC<AlertProps> = ({ message, type = 'info', onClose, className = '', details, children }) => {
  const baseStyles = 'p-4 rounded-md flex items-start relative';
  const typeStyles = {
    success: 'bg-green-50 text-green-700',
    error: 'bg-red-50 text-red-700',
    warning: 'bg-yellow-50 text-yellow-700',
    info: 'bg-blue-50 text-blue-700',
  };
  const iconClasses = {
    success: 'heroicons-outline-check-circle',
    error: 'heroicons-outline-x-circle',
    warning: 'heroicons-outline-exclamation-triangle',
    info: 'heroicons-outline-information-circle',
  }

  return (
    <div className={`${baseStyles} ${typeStyles[type]} ${className}`} role="alert">
      <div className="flex-shrink-0">
        <i className={`h-5 w-5 ${iconClasses[type]}`}></i>
      </div>
      <div className="ml-3 flex-grow"> {/* Added flex-grow to allow children to take space */}
        <p className="text-sm font-medium">{message}</p>
        {details && <p className="text-xs mt-1">{details}</p>}
        {children && <div className="mt-2">{children}</div>} {/* Render children */}
      </div>
      {onClose && (
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex rounded-md p-1.5 ${typeStyles[type].replace('text-', 'hover:bg-opacity-20 hover:bg-current focus:bg-opacity-20 focus:bg-current ')} focus:outline-none focus:ring-2 focus:ring-offset-2`}
              aria-label="Fechar" // Added aria-label for accessibility
            >
              <span className="sr-only">Fechar</span>
              <i className="h-5 w-5 heroicons-outline-x-mark"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface ResponsiveTableProps<T> {
  columns: Array<{ header: string; accessor: keyof T | ((item: T, index: number) => ReactNode); className?: string, headerClassName?: string, cellClassName?: string }>; 
  data: T[];
  isLoading?: boolean;
  emptyStateMessage?: string;
  onRowClick?: (item: T) => void;
  rowKeyAccessor: keyof T | ((item: T) => string | number) ; 
}

export const ResponsiveTable = <T extends object,>({
  columns,
  data,
  isLoading = false,
  emptyStateMessage = "Nenhum dado encontrado.",
  onRowClick,
  rowKeyAccessor,
}: ResponsiveTableProps<T>): React.ReactElement => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="text-center text-gray-500 py-10">{emptyStateMessage}</p>;
  }

  const getRowKey = (item: T, index: number): string | number => {
    if (typeof rowKeyAccessor === 'function') return rowKeyAccessor(item);
    const keyValue = item[rowKeyAccessor];
    return keyValue !== undefined && keyValue !== null ? String(keyValue) : index;
  };


  return (
    <div className="overflow-x-auto shadow-md rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, index) => (
              <th
                key={index}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.headerClassName || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, rowIndex) => (
            <tr 
              key={getRowKey(item, rowIndex)} 
              className={`${onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
              onClick={() => onRowClick && onRowClick(item)}
              role={onRowClick ? "button" : undefined} // Added role for accessibility
              tabIndex={onRowClick ? 0 : undefined} // Added tabIndex for accessibility
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onRowClick(item); } : undefined} // Added keyboard interaction
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex} className={`px-6 py-4 whitespace-normal break-words text-sm text-gray-700 ${col.className || ''} ${col.cellClassName || ''}`}>
                  {typeof col.accessor === 'function'
                    ? col.accessor(item, rowIndex)
                    : (item[col.accessor as keyof T] as ReactNode)} 
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface TabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
  count?: number;
}

export const Tab: React.FC<TabProps> = ({ label, isActive, onClick, className = '', count }) => (
  <button
    onClick={onClick}
    role="tab"
    aria-selected={isActive}
    className={`px-4 py-2 font-medium text-sm rounded-t-md focus:outline-none transition-colors duration-150
                ${isActive ? 'bg-blu-primary text-white border-b-2 border-blu-primary' : 'text-black/60 hover:bg-black/5 hover:text-blu-primary border-b-2 border-transparent'}
                ${className}`}
  >
    {label} {count !== undefined && <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${isActive ? 'bg-blu-accent text-blu-primary' : 'bg-blu-accent text-blu-primary'}`}>{count}</span>}
  </button>
);

interface TabsProps {
  children: ReactNode;
  className?: string; 
  navClassName?: string; 
}
export const Tabs: React.FC<TabsProps> = ({ children, className = '', navClassName = '' }) => (
  <div className={className}>
    <nav role="tablist" className={`flex border-b border-black/20 mb-0 ${navClassName}`}> {/* Added role="tablist" and nav element */}
      {children}
    </nav>
  </div>
);

interface StepperProps {
  steps: string[];
  currentStep: number;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => (
  <div className="flex items-center justify-between mb-4">
    {steps.map((step, idx) => (
      <div key={idx} className="flex items-center flex-1">
        <div
          className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-semibold ${
            idx < currentStep ? "bg-blu-primary text-white" : idx === currentStep ? "bg-blu-accent text-blu-primary" : "border border-black/20 text-black"
          }`}
        >
          {idx < currentStep ? "✓" : idx + 1}
        </div>
        <span className={`ml-2 text-sm ${idx <= currentStep ? 'text-blu-primary font-medium' : 'text-black/60'}`}>{step}</span>
        {idx < steps.length - 1 && (
          <div className={`flex-1 h-0.5 ${idx < currentStep ? 'bg-blu-primary' : 'bg-black/20'} mx-2`} />
        )}
      </div>
    ))}
  </div>
);

interface OrderProgressBarProps {
  status: OrderStatus;
}

const ORDER_PROGRESS_STEPS = [
  { label: 'Contrato assinado', statuses: [OrderStatus.PEDIDO_CRIADO] },
  { label: 'Pagamento recebido', statuses: [OrderStatus.PAGAMENTO_CONFIRMADO] },
  { label: 'Produto comprado', statuses: [OrderStatus.COMPRA_REALIZADA] },
  { label: 'Em trânsito', statuses: [
      OrderStatus.A_CAMINHO_DO_ESCRITORIO,
      OrderStatus.CHEGOU_NO_ESCRITORIO,
      OrderStatus.AGUARDANDO_RETIRADA,
      OrderStatus.ENVIADO,
    ] },
  { label: 'Entregue', statuses: [OrderStatus.ENTREGUE] },
];

const getProgressIndex = (status: OrderStatus): number => {
  for (let i = ORDER_PROGRESS_STEPS.length - 1; i >= 0; i--) {
    if (ORDER_PROGRESS_STEPS[i].statuses.includes(status)) return i;
  }
  return 0;
};

export const OrderProgressBar: React.FC<OrderProgressBarProps> = ({ status }) => {
  const currentIdx = getProgressIndex(status);
  return (
    <div className="flex items-center space-x-1 w-full" title={ORDER_PROGRESS_STEPS[currentIdx].label}>
      {ORDER_PROGRESS_STEPS.map((_, idx) => (
        <React.Fragment key={idx}>
          <div
            className={`w-2 h-2 rounded-full ${idx <= currentIdx ? 'bg-blu-primary' : 'bg-gray-300'}`}
          />
          {idx < ORDER_PROGRESS_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 ${idx < currentIdx ? 'bg-blu-primary' : 'bg-gray-300'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, actionLabel, onAction, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-5 right-5 bg-green-600 text-white px-4 py-3 rounded shadow-lg flex items-center space-x-3 z-50">
      <span className="text-sm">{message}</span>
      {actionLabel && onAction && (
        <button onClick={onAction} className="underline text-white font-semibold text-sm">
          {actionLabel}
        </button>
      )}
      <button onClick={onClose} className="ml-2 text-white hover:text-gray-200">
        <i className="heroicons-outline-x-mark h-4 w-4" />
      </button>
    </div>
  );
};
