import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Auth from "@/pages/Auth";
import { CreateProjectPage, EditorPage } from "@/pages/BuilderPages";
import SettingsPage from "@/pages/SettingsPage";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import { DashboardPage, ExportsPage, ProjectsPage, TemplatesPage } from "@/pages/WorkspacePages";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/auth" component={Auth} />
    <Route path="/app" component={DashboardPage} />
    <Route path="/projects" component={ProjectsPage} />
    <Route path="/create" component={CreateProjectPage} />
    <Route path="/templates" component={TemplatesPage} />
    <Route path="/exports" component={ExportsPage} />
    <Route path="/editor/:id" component={EditorPage} />
    <Route path="/settings" component={SettingsPage} />
    <Route component={NotFound} />
  </Switch>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><LocaleProvider><TooltipProvider><Router /><Toaster /></TooltipProvider></LocaleProvider></ThemeProvider></ErrorBoundary>;
}

export default App;
