"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { io, Socket } from "socket.io-client";
import "xterm/css/xterm.css";
import { X, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import useAuthStore from "@/hooks/use-auth-store";

interface TerminalComponentProps {
  vmId: number | string;
  vmName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TerminalComponent({ vmId, vmName, isOpen, onClose }: TerminalComponentProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Lấy token từ auth store thay vì cookies
  const { token } = useAuthStore();

  useEffect(() => {
    if (!isOpen) return;
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: "#1e1e1e",
        foreground: "#cccccc",
        cursor: "#ffffff",
        selectionBackground: "#3a3d41",
      },
      rows: 24,
      cols: 80,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);

    fitAddon.fit();
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Kiểm tra token từ auth store
    if (!token) {
      setError("Authentication required. Please login again.");
      setIsConnecting(false);
      term.writeln("\r\n\x1b[1;31m✗ Error: No authentication token found\x1b[0m");
      term.writeln("\x1b[90mPlease refresh the page and login again.\x1b[0m");
      return;
    }

    // Connect to WebSocket
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003";
    // Remove /api from URL to get base domain for socket.io connection
    const baseUrl = apiUrl.replace(/\/api$/, '');
    
    console.log("🔌 Connecting to WebSocket:", `${baseUrl} with path /api/socket.io/`);
    
    const socket = io(baseUrl, {
      path: '/api/socket.io/',
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Socket event handlers
    socket.on("connect", () => {
      console.log("Socket connected, starting terminal session...");
      socket.emit("terminal:start", { vmId });
    });

    socket.on("terminal:ready", (data) => {
      console.log("Terminal ready:", data);
      setIsConnected(true);
      setIsConnecting(false);
      term.writeln(`\x1b[1;32m✓ Connected to ${data.vmName || "VM"}\x1b[0m`);
      term.writeln(`\x1b[90mIP: ${data.vmIp}\x1b[0m`);
      term.writeln("");
    });

    socket.on("terminal:data", (data: string) => {
      term.write(data);
    });

    socket.on("terminal:error", (data) => {
      console.error("Terminal error:", data);
      setError(data.message || "Terminal error occurred");
      setIsConnecting(false);
      term.writeln(`\r\n\x1b[1;31m✗ Error: ${data.message}\x1b[0m`);
    });

    socket.on("terminal:close", (data) => {
      console.log("Terminal closed:", data);
      term.writeln("\r\n\x1b[1;33m⚠ Connection closed\x1b[0m");
      setIsConnected(false);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
      term.writeln("\r\n\x1b[1;33m⚠ Disconnected from server\x1b[0m");
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setError("Failed to connect to terminal server");
      setIsConnecting(false);
    });

    // Handle terminal input
    term.onData((data) => {
      if (socket.connected) {
        socket.emit("terminal:data", data);
      }
    });

    // Handle terminal resize
    const handleResize = () => {
      fitAddon.fit();
      if (socket.connected && term.rows && term.cols) {
        socket.emit("terminal:resize", {
          rows: term.rows,
          cols: term.cols,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (socket) {
        socket.emit("terminal:close");
        socket.disconnect();
      }
      term.dispose();
    };
  }, [vmId, isOpen, token]); // Thêm token vào dependencies

  const handleReconnect = () => {
    setError(null);
    setIsConnecting(true);
    
    // Kiểm tra token trước khi reconnect
    if (!token) {
      setError("Authentication required. Please login again.");
      setIsConnecting(false);
      return;
    }
    
    setIsConnecting(true);
    if (socketRef.current) {
      socketRef.current.connect();
      socketRef.current.emit("terminal:start", { vmId });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    setTimeout(() => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        if (socketRef.current?.connected && xtermRef.current.rows && xtermRef.current.cols) {
          socketRef.current.emit("terminal:resize", {
            rows: xtermRef.current.rows,
            cols: xtermRef.current.cols,
          });
        }
      }
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`flex flex-col bg-gray-900 rounded-lg overflow-hidden shadow-2xl ${
          isFullscreen ? "w-full h-full" : "w-full max-w-6xl h-[600px]"
        }`}
      >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-sm font-medium text-gray-300 ml-2">
            {vmName || `VM #${vmId}`} Terminal
          </span>
          {isConnecting && (
            <span className="text-xs text-yellow-400 ml-2">Connecting...</span>
          )}
          {isConnected && (
            <span className="text-xs text-green-400 ml-2">● Connected</span>
          )}
          {error && !isConnecting && (
            <span className="text-xs text-red-400 ml-2">● Disconnected</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {error && !isConnecting && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReconnect}
              className="h-7 px-2"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="h-7 px-2"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 px-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Terminal */}
      <div className="flex-1 p-2 overflow-hidden">
        {error && !isConnecting && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={handleReconnect} variant="outline">
                Reconnect
              </Button>
            </div>
          </div>
        )}
        <div
          ref={terminalRef}
          className="w-full h-full"
          style={{ visibility: error && !isConnecting ? "hidden" : "visible" }}
        />
      </div>
      </div>
    </div>
  );
}
