import { Moon, Sun } from "lucide-react"
import { NavIconButton } from "@/components/ui/nav-icon-button"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <NavIconButton onClick={toggleTheme}>
      <Sun className="h-4 w-4 md:h-6 md:w-6 lg:h-8 lg:w-8 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 md:h-6 md:w-6 lg:h-8 lg:w-8 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </NavIconButton>
  )
}