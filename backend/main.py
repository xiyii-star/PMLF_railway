"""
FastAPI Backend Server for EvoNarrator Web Application
Provides REST API and WebSocket for pipeline execution and results retrieval
"""

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import sys

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Get project root directory
PROJECT_ROOT = Path(__file__).parent.parent

# Add src directory to path
sys.path.insert(0, str(PROJECT_ROOT / 'src'))

# 尝试导入 Pipeline，处理路径可能存在的问题
try:
    from pipeline import PaperGraphPipeline
except ImportError:
    # 如果直接运行 main.py，可能需要调整路径
    sys.path.append(str(PROJECT_ROOT))
    from src.pipeline import PaperGraphPipeline

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="EvoNarrator API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://pmlf-frontend.2fd15639.er.aliyun-esa.net"  # Production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
tasks: Dict[str, Dict] = {}
task_logs: Dict[str, List[str]] = {}
task_results: Dict[str, Dict] = {}
active_connections: Dict[str, List[WebSocket]] = {}
main_event_loop = None  # 用于在同步线程中调度异步任务


# === Custom Log Handler for WebSocket Broadcasting ===
class WebSocketLogHandler(logging.Handler):
    """Custom logging handler that broadcasts log messages to WebSocket clients"""

    def __init__(self, task_id: str):
        super().__init__()
        self.task_id = task_id
        # Set formatter to match the logging format
        formatter = logging.Formatter('%(levelname)s - %(name)s - %(message)s')
        self.setFormatter(formatter)

    def emit(self, record):
        """Emit a log record by broadcasting it to WebSocket"""
        try:
            msg = self.format(record)
            broadcast_log(self.task_id, msg)
        except Exception:
            # Silently fail to avoid breaking the logging system
            pass

# === 修复 1: 获取主事件循环 ===
@app.on_event("startup")
async def startup_event():
    global main_event_loop
    main_event_loop = asyncio.get_running_loop()

# Pydantic models
class PipelineStartRequest(BaseModel):
    topic: str
    max_papers: Optional[int] = 15
    skip_pdf: Optional[bool] = False
    quick: Optional[bool] = False
    use_llm: Optional[bool] = True
    use_deep_paper: Optional[bool] = True
    use_snowball: Optional[bool] = False
    config_overrides: Optional[Dict[str, Any]] = None


class TaskStatus(BaseModel):
    task_id: str
    status: str  # pending, running, completed, failed
    progress: Dict[str, Any]
    current_phase: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None


# Helper functions
def get_output_files(task_id: str, topic: str) -> Dict[str, Optional[Path]]:
    """Get output file paths for a task"""
    output_dir = PROJECT_ROOT / 'output'

    # Find files matching pattern: {task_id}_{pattern}_{topic}_*.{ext}
    files = {}
    for pattern in ['papers', 'graph_data', 'graph_viz', 'deep_survey', 'research_ideas']:
        matches = list(output_dir.glob(f"{task_id}_{pattern}_{topic}_*.json"))
        if not matches:
            matches = list(output_dir.glob(f"{task_id}_{pattern}_{topic}_*.html"))
        if matches:
            files[pattern] = matches[0]
        else:
            files[pattern] = None

    return files


def scan_output_directory() -> List[Dict]:
    """Scan output directory for all completed analyses"""
    output_dir = PROJECT_ROOT / 'output'
    if not output_dir.exists():
        output_dir.mkdir(parents=True)
        
    results = []
    
    # Find all papers JSON files
    for papers_file in output_dir.glob("*_papers_*.json"):
        try:
            # Parse filename: {task_id}_papers_{topic}_{timestamp}.json
            # timestamp format: YYYYMMDD_HHMMSS (2 parts when split by _)
            parts = papers_file.stem.split('_')
            if len(parts) >= 4:
                task_id = parts[0]
                # timestamp is last 2 parts: YYYYMMDD_HHMMSS
                timestamp = '_'.join(parts[-2:])
                # topic is everything between 'papers' and timestamp
                topic = '_'.join(parts[2:-2])
                
                # Load metadata
                with open(papers_file, 'r', encoding='utf-8') as f:
                    papers_data = json.load(f)
                
                # Get other files
                files = get_output_files(task_id, topic)
                
                results.append({
                    'task_id': task_id,
                    'topic': topic,
                    'timestamp': timestamp,
                    'paper_count': len(papers_data) if isinstance(papers_data, list) else 0,
                    'files': {k: str(v) if v else None for k, v in files.items()},
                    'created_at': datetime.fromtimestamp(papers_file.stat().st_mtime).isoformat()
                })
        except Exception as e:
            logger.warning(f"Failed to parse file {papers_file}: {e}")
            continue
    
    # Sort by creation time (newest first)
    results.sort(key=lambda x: x['created_at'], reverse=True)
    return results


# === 修复 2: 确保 Progress 数据结构嵌套正确 ===
def update_progress(task_id: str, phase: str, progress: Dict[str, Any]):
    """Update task progress with nested phase keys"""
    if task_id in tasks:
        tasks[task_id]['current_phase'] = phase
        # 初始化该 phase 的字典（如果不存在）
        if phase not in tasks[task_id]['progress']:
            tasks[task_id]['progress'][phase] = {}
        # 将进度更新到具体的 phase key 下
        tasks[task_id]['progress'][phase].update(progress)


# === 修复 3: 线程安全的日志广播 ===
def broadcast_log(task_id: str, message: str):
    """Broadcast log message to all WebSocket connections for this task"""
    if task_id not in task_logs:
        task_logs[task_id] = []
    
    timestamp = datetime.now().isoformat()
    log_entry = {
        'timestamp': timestamp,
        'message': message
    }
    
    task_logs[task_id].append(log_entry)
    
    # Keep only last 1000 logs
    if len(task_logs[task_id]) > 1000:
        task_logs[task_id] = task_logs[task_id][-1000:]
    
    # Broadcast to WebSocket connections safely from a thread
    if task_id in active_connections:
        # 定义异步发送函数
        async def send_msg(ws, data):
            try:
                await ws.send_json(data)
            except Exception:
                # 这里不处理移除，由 websocket_logs 的 receive 循环处理断开
                pass

        # 使用主线程的 loop 调度发送任务
        if main_event_loop and main_event_loop.is_running():
            connections = active_connections[task_id].copy() # 浅拷贝防止迭代时修改
            for ws in connections:
                try:
                    asyncio.run_coroutine_threadsafe(
                        send_msg(ws, log_entry), 
                        main_event_loop
                    )
                except Exception as e:
                    logger.error(f"Failed to schedule ws message: {e}")


def run_pipeline(task_id: str, request: PipelineStartRequest, config_overrides: Dict = None):
    """Run pipeline in background thread"""
    # Update task status
    tasks[task_id]['status'] = 'running'
    tasks[task_id]['started_at'] = datetime.now().isoformat()
    
    # Broadcast status update
    broadcast_log(task_id, f"🚀 Starting pipeline for topic: {request.topic}")
    
    # Prepare config
    config = {}
    if request.max_papers:
        config['max_papers'] = request.max_papers
    if request.skip_pdf:
        config['download_pdfs'] = False
    if request.quick:
        config.update({
            'max_papers': 8,
            'max_citations': 2,
            'max_references': 2,
            'max_pdf_downloads': 3
        })
    if request.use_deep_paper:
        config['use_deep_paper'] = True
        config['use_llm'] = True
    elif request.use_llm:
        config['use_llm'] = True
        config['use_deep_paper'] = False
    
    if config_overrides:
        config.update(config_overrides)
    
    # Set correct config file path (relative to project root)
    if 'llm_config_file' not in config:
        config['llm_config_file'] = str(PROJECT_ROOT / 'config' / 'config.yaml')
    
    # Change to project root directory for pipeline execution
    original_cwd = os.getcwd()

    # Setup WebSocket log handler to capture all logs
    ws_handler = WebSocketLogHandler(task_id)
    ws_handler.setLevel(logging.INFO)

    # Get root logger and add our handler
    root_logger = logging.getLogger()
    root_logger.addHandler(ws_handler)

    try:
        os.chdir(PROJECT_ROOT)

        # Create pipeline with task_id for proper file naming
        pipeline = PaperGraphPipeline(config, task_id=task_id)
            
        # Run pipeline with progress tracking
        update_progress(task_id, 'phase1', {'name': 'Paper Search', 'status': 'running'})
        broadcast_log(task_id, "📋 Phase 1: Paper Search...")
        pipeline._phase1_paper_search(request.topic)
        update_progress(task_id, 'phase1', {'name': 'Paper Search', 'status': 'completed', 'papers_found': len(pipeline.papers)})
        
        update_progress(task_id, 'phase2', {'name': 'PDF Download', 'status': 'running'})
        broadcast_log(task_id, "📥 Phase 2: PDF Download...")
        pipeline._phase2_pdf_download()
        update_progress(task_id, 'phase2', {'name': 'PDF Download', 'status': 'completed'})
        
        update_progress(task_id, 'phase3', {'name': 'Paper Analysis', 'status': 'running'})
        broadcast_log(task_id, "🧠 Phase 3: Paper Analysis...")
        pipeline._phase3_paper_rag_analysis()
        update_progress(task_id, 'phase3', {'name': 'Paper Analysis', 'status': 'completed', 'analyzed': len(pipeline.enriched_papers)})
        
        update_progress(task_id, 'phase4', {'name': 'Citation Type Inference', 'status': 'running'})
        broadcast_log(task_id, "🔗 Phase 4: Citation Type Inference...")
        pipeline._phase4_citation_type_inference()
        update_progress(task_id, 'phase4', {'name': 'Citation Type Inference', 'status': 'completed'})
        
        update_progress(task_id, 'phase5', {'name': 'Knowledge Graph Construction', 'status': 'running'})
        broadcast_log(task_id, "🕸️ Phase 5: Knowledge Graph Construction...")
        pipeline._phase5_knowledge_graph()
        update_progress(task_id, 'phase5', {'name': 'Knowledge Graph Construction', 'status': 'completed'})
        
        update_progress(task_id, 'phase6', {'name': 'Deep Survey Generation', 'status': 'running'})
        broadcast_log(task_id, "📝 Phase 6: Deep Survey Generation...")
        pipeline._phase6_deep_survey_generation(request.topic)
        update_progress(task_id, 'phase6', {'name': 'Deep Survey Generation', 'status': 'completed'})
        
        update_progress(task_id, 'phase7', {'name': 'Research Ideas Generation', 'status': 'running'})
        broadcast_log(task_id, "💡 Phase 7: Research Ideas Generation...")
        pipeline._phase7_research_idea_generation(request.topic)
        update_progress(task_id, 'phase7', {'name': 'Research Ideas Generation', 'status': 'completed'})
        
        update_progress(task_id, 'phase8', {'name': 'Results Output', 'status': 'running'})
        broadcast_log(task_id, "💾 Phase 8: Results Output...")
        results = pipeline._phase8_output_results(request.topic)
        update_progress(task_id, 'phase8', {'name': 'Results Output', 'status': 'completed'})
        
        # Store results
        task_results[task_id] = results
        
        # Update task status
        tasks[task_id]['status'] = 'completed'
        tasks[task_id]['completed_at'] = datetime.now().isoformat()
        tasks[task_id]['results'] = {
            'topic': results['topic'],
            'summary': results['summary'],
            'files': results['files']
        }
        
        broadcast_log(task_id, "✅ Pipeline completed successfully!")
        
    except Exception as e:
        logger.error(f"Pipeline execution failed for task {task_id}: {e}", exc_info=True)
        tasks[task_id]['status'] = 'failed'
        tasks[task_id]['error'] = str(e)
        tasks[task_id]['completed_at'] = datetime.now().isoformat()
        broadcast_log(task_id, f"❌ Pipeline failed: {str(e)}")
    finally:
        # Remove WebSocket log handler
        root_logger.removeHandler(ws_handler)
        ws_handler.close()

        # Restore original working directory
        try:
            os.chdir(original_cwd)
        except:
            pass


# API Routes
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "EvoNarrator API",
        "version": "1.0.0",
        "status": "running"
    }


@app.post("/api/pipeline/start", response_model=TaskStatus)
async def start_pipeline(request: PipelineStartRequest, background_tasks: BackgroundTasks):
    """Start a new pipeline execution"""
    task_id = str(uuid.uuid4())
    
    # Create task record
    tasks[task_id] = {
        'task_id': task_id,
        'status': 'pending',
        'topic': request.topic,
        'config': request.dict(),
        'progress': {},
        'current_phase': None,
        'started_at': None,
        'completed_at': None,
        'error': None
    }
    
    task_logs[task_id] = []
    
    # Start pipeline in background
    config_overrides = request.config_overrides or {}
    background_tasks.add_task(run_pipeline, task_id, request, config_overrides)
    
    return TaskStatus(
        task_id=task_id,
        status='pending',
        progress={},
        current_phase=None
    )


@app.get("/api/pipeline/status/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str):
    """Get task status"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[task_id]
    return TaskStatus(
        task_id=task_id,
        status=task['status'],
        progress=task.get('progress', {}),
        current_phase=task.get('current_phase'),
        started_at=task.get('started_at'),
        completed_at=task.get('completed_at'),
        error=task.get('error')
    )


@app.get("/api/pipeline/logs/{task_id}")
async def get_task_logs(task_id: str, limit: int = 100):
    """
    Get task logs for polling fallback
    Returns the most recent logs for the specified task
    """
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    # Get logs for this task (default to empty list if not found)
    logs = task_logs.get(task_id, [])

    # Return the most recent logs (limited by the limit parameter)
    recent_logs = logs[-limit:] if len(logs) > limit else logs

    return {
        "logs": recent_logs,
        "total_count": len(logs)
    }


# === 修复 4: 安全的 WebSocket 处理 ===
@app.websocket("/api/pipeline/logs/{task_id}")
async def websocket_logs(websocket: WebSocket, task_id: str):
    """WebSocket endpoint for real-time logs"""
    await websocket.accept()
    
    if task_id not in active_connections:
        active_connections[task_id] = []
    
    active_connections[task_id].append(websocket)
    
    # Send existing logs (发送历史日志)
    if task_id in task_logs:
        for log_entry in task_logs[task_id][-100:]:
            try:
                await websocket.send_json(log_entry)
            except:
                break
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        # 安全地移除连接
        if task_id in active_connections:
            # 只有当 websocket 确实在列表中时才移除
            if websocket in active_connections[task_id]:
                active_connections[task_id].remove(websocket)
            
            # 如果列表空了，清理 key
            if not active_connections[task_id]:
                del active_connections[task_id]
    except Exception as e:
        logger.error(f"WebSocket error for task {task_id}: {e}")
        # 双重检查移除
        if task_id in active_connections and websocket in active_connections[task_id]:
             active_connections[task_id].remove(websocket)


@app.get("/api/results")
async def list_results():
    """List all historical analysis results"""
    return scan_output_directory()


@app.get("/api/results/{task_id}")
async def get_result(task_id: str):
    """Get result data for a specific task"""
    # First check if task is in memory
    if task_id in task_results:
        result = task_results[task_id]
        # If result only has metadata, load actual data from files
        if 'papers' not in result and 'files' in result:
            output_dir = PROJECT_ROOT / 'output'
            files = result.get('files', {})

            # Load papers from file
            if 'papers_data' in files:
                papers_path = output_dir.parent / files['papers_data']
                if papers_path.exists():
                    with open(papers_path, 'r', encoding='utf-8') as f:
                        result['papers'] = json.load(f)

            # Load graph data from file
            if 'graph_data' in files:
                graph_path = output_dir.parent / files['graph_data']
                if graph_path.exists():
                    with open(graph_path, 'r', encoding='utf-8') as f:
                        result['graph_data'] = json.load(f)

        return result
    
    # Otherwise, try to load from files
    output_dir = PROJECT_ROOT / 'output'
    papers_file = None
    
    for f in output_dir.glob(f"{task_id}_papers_*.json"):
        papers_file = f
        break
    
    if not papers_file:
        raise HTTPException(status_code=404, detail="Result not found")
    
    # Parse topic from filename
    # Format: {task_id}_papers_{topic}_{timestamp}.json
    # timestamp format: YYYYMMDD_HHMMSS (2 parts when split by _)
    parts = papers_file.stem.split('_')
    topic = '_'.join(parts[2:-2])
    
    # Load all related files
    files = get_output_files(task_id, topic)
    
    result = {
        'task_id': task_id,
        'topic': topic,
        'files': {}
    }
    
    # Load papers
    if files['papers']:
        with open(files['papers'], 'r', encoding='utf-8') as f:
            result['papers'] = json.load(f)
    
    # Load graph data
    if files['graph_data']:
        with open(files['graph_data'], 'r', encoding='utf-8') as f:
            result['graph_data'] = json.load(f)
    
    # Load deep survey
    if files['deep_survey']:
        with open(files['deep_survey'], 'r', encoding='utf-8') as f:
            result['deep_survey'] = json.load(f)
    
    # Load research ideas
    if files['research_ideas']:
        with open(files['research_ideas'], 'r', encoding='utf-8') as f:
            result['research_ideas'] = json.load(f)
    
    return result


@app.get("/api/results/{task_id}/papers")
async def get_papers(task_id: str):
    """Get papers list for a task"""
    result = await get_result(task_id)
    return result.get('papers', [])


@app.get("/api/results/{task_id}/graph")
async def get_graph_data(task_id: str):
    """Get knowledge graph data for a task"""
    result = await get_result(task_id)
    return result.get('graph_data', {})


@app.get("/api/results/{task_id}/survey")
async def get_survey(task_id: str):
    """Get deep survey report for a task"""
    result = await get_result(task_id)
    return result.get('deep_survey', {})


@app.get("/api/results/{task_id}/ideas")
async def get_ideas(task_id: str):
    """Get research ideas for a task"""
    result = await get_result(task_id)
    return result.get('research_ideas', {})


@app.get("/api/results/{task_id}/visualization")
async def get_visualization(task_id: str):
    """Get visualization HTML file"""
    output_dir = PROJECT_ROOT / 'output'
    
    # Find visualization file
    viz_file = None
    for f in output_dir.glob(f"{task_id}_graph_viz_*.html"):
        viz_file = f
        break
    
    if not viz_file:
        raise HTTPException(status_code=404, detail="Visualization not found")
    
    return FileResponse(viz_file, media_type="text/html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)