"""Local consent and lifecycle window; no background or login startup."""
import secrets
import threading
import tkinter as tk
from tkinter import ttk, messagebox
import companion


class WorkshopService:
    def __init__(self, address=('127.0.0.1', 8765)):
        self.address = address
        self.server = None
        self.thread = None

    def start(self):
        if self.server:
            return
        # Bind before touching history or rotating credentials. A second launch
        # must never disturb an existing companion.
        server = companion.ThreadingHTTPServer(self.address, companion.Handler)
        companion.TOKEN = secrets.token_urlsafe(24)
        with companion.LOCK:
            companion.STOPPING = False
            companion.CANCEL.clear()
        for job in companion.history():
            if job['status'] in ('queued', 'planning', 'rendering', 'running'):
                job.update(status='stopped', error='Workshop restarted; this run was interrupted.')
                companion.save(job)
        self.server = server
        self.thread = threading.Thread(target=server.serve_forever, daemon=True)
        self.thread.start()

    def request_stop(self):
        with companion.LOCK:
            companion.STOPPING = True
            companion.CANCEL.set()

    def finish_stop(self):
        with companion.LOCK:
            if companion.ACTIVE:
                return False
        if self.server:
            self.server.shutdown()
            self.server.server_close()
            self.thread.join(timeout=2)
            self.server = None
        companion.codex_agent.disconnect()
        return True


class WorkshopWindow:
    def __init__(self, root):
        self.root = root
        self.service = WorkshopService()
        self.closing = False
        root.title('Collaborator · This computer')
        root.geometry('600x440')
        root.minsize(550, 420)
        root.protocol('WM_DELETE_WINDOW', self.close)
        frame = ttk.Frame(root, padding=24)
        frame.pack(fill='both', expand=True)
        ttk.Label(frame, text='Your computer. Your contribution.', font=('Segoe UI', 18, 'bold')).pack(anchor='w')
        ttk.Label(frame, text='Start when you want to work on a mission. Stop when you’re done.', wraplength=520, font=('Segoe UI', 11)).pack(anchor='w', pady=(10, 18))
        self.consent = tk.BooleanVar(value=False)
        ttk.Checkbutton(frame, text='Allow Collaborator to use my configured tools while this window is open.', variable=self.consent, command=self.sync_start).pack(anchor='w')
        ttk.Label(frame, text='Only the paired Collaborator site can request supported operations.\nNothing starts automatically when you sign in to your PC.', wraplength=520).pack(anchor='w', pady=(8, 18))
        self.status = tk.StringVar(value='Stopped · no tool access')
        ttk.Label(frame, textvariable=self.status, wraplength=520).pack(anchor='w')
        self.code = tk.StringVar()
        ttk.Entry(frame, textvariable=self.code, state='readonly', font=('Consolas', 12)).pack(fill='x', pady=(14, 8))
        buttons = ttk.Frame(frame)
        buttons.pack(fill='x')
        self.start_button = ttk.Button(buttons, text='Start workshop', command=self.start, state='disabled')
        self.start_button.pack(side='left')
        self.copy_button = ttk.Button(buttons, text='Copy pairing code', command=self.copy, state='disabled')
        self.copy_button.pack(side='left', padx=8)
        self.stop_button = ttk.Button(buttons, text='Stop workshop', command=self.stop, state='disabled')
        self.stop_button.pack(side='left')
        ttk.Label(frame, text='Paste the code into your mission’s “Connect your computer” panel.\nKeep this window open. Each start creates a new code; your work is retained.', wraplength=520).pack(anchor='w', pady=18)

    def sync_start(self):
        self.start_button.configure(state='normal' if self.consent.get() and not self.service.server else 'disabled')

    def start(self):
        if not self.consent.get():
            return
        try:
            self.service.start()
        except OSError:
            messagebox.showerror('Could not start', 'Another workshop may already be running. Stop it first, then try again.', parent=self.root)
            return
        self.code.set(companion.TOKEN)
        self.status.set('Running · ready to pair with your mission')
        self.start_button.configure(state='disabled')
        self.copy_button.configure(state='normal')
        self.stop_button.configure(state='normal')

    def copy(self):
        self.root.clipboard_clear()
        self.root.clipboard_append(self.code.get())
        self.status.set('Code copied · paste it into your mission workshop')

    def stop(self):
        self.service.request_stop()
        self.stop_button.configure(state='disabled')
        self.copy_button.configure(state='disabled')
        self.code.set('')
        self.status.set('Stopping safely… waiting for any active request to finish.')
        self.poll_stop()

    def poll_stop(self):
        if not self.service.finish_stop():
            self.root.after(500, self.poll_stop)
            return
        self.status.set('Stopped · your local work is retained')
        self.consent.set(False)
        self.sync_start()
        if self.closing:
            self.root.destroy()

    def close(self):
        if self.closing:
            return
        if self.service.server and not messagebox.askokcancel('Stop workshop?', 'Closing stops access from Collaborator. An active run will be cancelled safely before this window closes.', parent=self.root):
            return
        self.closing = True
        self.stop()


if __name__ == '__main__':
    root = tk.Tk()
    WorkshopWindow(root)
    root.mainloop()
