// BlockBusterHudIndicator.cs
// Minimal HUD state for Block-Buster ready/consumed.

using System.Collections;
using UnityEngine;

public class BlockBusterHudIndicator : MonoBehaviour
{
    [SerializeField] private TankControllerBase observedTank;
    [SerializeField] private GameObject readyStateObject;
    [SerializeField] private GameObject consumedStateObject;
    [SerializeField, Min(0f)] private float consumedStateDurationSeconds = 0.75f;

    private bool wasReady;
    private Coroutine hideConsumedRoutine;

    private void Awake()
    {
        if (observedTank == null)
        {
            observedTank = GetComponentInParent<TankControllerBase>();
        }
    }

    private void OnEnable()
    {
        if (observedTank != null)
        {
            observedTank.BlockBusterReadyChanged += HandleReadyChanged;
            wasReady = observedTank.IsBlockBusterReady;
            SetReadyVisual(wasReady);
            SetConsumedVisual(false);
            return;
        }

        SetReadyVisual(false);
        SetConsumedVisual(false);
    }

    private void OnDisable()
    {
        if (observedTank != null)
        {
            observedTank.BlockBusterReadyChanged -= HandleReadyChanged;
        }

        if (hideConsumedRoutine != null)
        {
            StopCoroutine(hideConsumedRoutine);
            hideConsumedRoutine = null;
        }
    }

    private void HandleReadyChanged(bool isReady)
    {
        bool consumedThisFrame = wasReady && !isReady;
        wasReady = isReady;

        SetReadyVisual(isReady);

        if (consumedThisFrame)
        {
            ShowConsumedPulse();
        }
        else if (isReady)
        {
            SetConsumedVisual(false);
        }
    }

    private void SetReadyVisual(bool isReady)
    {
        if (readyStateObject != null)
        {
            readyStateObject.SetActive(isReady);
        }
    }

    private void ShowConsumedPulse()
    {
        if (consumedStateObject == null)
        {
            return;
        }

        if (hideConsumedRoutine != null)
        {
            StopCoroutine(hideConsumedRoutine);
        }

        SetConsumedVisual(true);
        hideConsumedRoutine = StartCoroutine(HideConsumedAfterDelay());
    }

    private IEnumerator HideConsumedAfterDelay()
    {
        yield return new WaitForSeconds(consumedStateDurationSeconds);
        SetConsumedVisual(false);
        hideConsumedRoutine = null;
    }

    private void SetConsumedVisual(bool isVisible)
    {
        if (consumedStateObject != null)
        {
            consumedStateObject.SetActive(isVisible);
        }
    }
}
