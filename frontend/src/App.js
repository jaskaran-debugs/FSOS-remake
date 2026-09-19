import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DemoProvider } from "@/domain/store";
import { UIProvider } from "@/components/idea/IdeaModalProvider";
import AppShell from "@/components/shell/AppShell";
import CommandRoom from "@/pages/CommandRoom";
import BOStudio from "@/pages/BOStudio";
import HPNDesk from "@/pages/HPNDesk";
import Production from "@/pages/Production";
import Distribution from "@/pages/Distribution";
import Performance from "@/pages/Performance";
import Settings from "@/pages/Settings";
import Help from "@/pages/Help";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <DemoProvider>
      <BrowserRouter>
        <UIProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<CommandRoom />} />
              <Route path="/bo" element={<BOStudio />} />
              <Route path="/hpn" element={<HPNDesk />} />
              <Route path="/production" element={<Production />} />
              <Route path="/distribution" element={<Distribution />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
            </Route>
          </Routes>
        </UIProvider>
      </BrowserRouter>
      <Toaster position="bottom-center" richColors />
    </DemoProvider>
  );
}

export default App;
