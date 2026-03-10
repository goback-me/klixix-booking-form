import Logo from "../assets/logo.svg"
import Cross from "../assets/cross.svg"

export default function Header() {
  const handleClose = () => {
    if (window.parent !== window) {
      window.parent.postMessage('carone-booking-close', '*')
    }
  }

  return (
    <header className="bg-primary-dark text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div>
          <img src={Logo} alt="Logo" width="160" height="36" className="sm:w-[180px] sm:h-[40px]" />
        </div>
        <div>
          <nav className="flex items-center gap-2 bg-white p-2 rounded-lg">
            <img src={Cross} alt="Close" width="24" height="24" className="cursor-pointer" onClick={handleClose} />
          </nav>
        </div>
      </div>
    </header>
  )
}