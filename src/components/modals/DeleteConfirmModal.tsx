interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isLoading?: boolean;
}

export default function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isLoading = false
}: Props) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
                <p className="text-gray-600 mb-6">{message}</p>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                        {isLoading ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}
