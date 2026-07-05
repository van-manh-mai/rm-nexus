"""Constitution Principle I — the NBC agent narrates only.

The boundary is structural, not prompt-wording: the agent's tool set is empty, so it
cannot call anything that could compute or alter a figure.
"""

from rm_agent import NBCAgent


def test_agent_tool_set_is_empty():
    agent = NBCAgent()
    assert agent.tools == []
    assert len(agent.tools) == 0
